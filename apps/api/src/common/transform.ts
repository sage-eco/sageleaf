import { BaseEntity } from '@mikro-orm/core'
import type {
  EntityDTO,
  EntityMetadata,
  EntityName,
  FindOptions,
  Loaded,
  ObjectQuery,
  QueryOrderMap,
  Ref,
} from '@mikro-orm/core'
import { EntityManager, raw } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'
import { plainToInstance } from 'class-transformer'
import type { ClassConstructor, ClassTransformOptions, TransformFnParams } from 'class-transformer'
import { GraphQLError } from 'graphql'
import _ from 'lodash'

import { BadRequestErr } from '@src/common/exceptions'
import { ASTNode, SearchQueryParser } from '@src/common/search-query.parser'
import { SearchQueryTranslator } from '@src/common/search-query.translator'
import { ZService } from '@src/common/z.service'
import { QueryField } from '@src/db/base.entity'
import { BaseModel, ModelRegistry } from '@src/graphql/base.model'
import {
  DEFAULT_PAGE_SIZE,
  EdgeType,
  IPaginationArgs,
  OrderDirection,
  PaginatedType,
  PaginationArgsSchema,
} from '@src/graphql/paginated'

export type EntityDTOCtx<T> = EntityDTO<T> & {
  _lang?: string[]
}

export interface Cursor<T, F extends string> {
  items: Loaded<T, never, F>[]
  count: number
}

export interface CursorOptions<T> {
  // Where clause for the query
  where: ObjectQuery<T>
  // Options for the query
  options: FindOptions<T, any>
}

@Injectable()
export class TransformService {
  constructor(
    private readonly zService: ZService,
    private readonly em: EntityManager,
  ) {}

  async entityToModel<T extends BaseEntity, S extends BaseModel>(
    model: (new () => S) | string,
    entity: Loaded<T, never> | Ref<T>,
  ): Promise<S> {
    return this.zService.entityToModel(model, entity)
  }

  async objectToModel<T, S extends BaseModel>(
    model: (new () => S) | string,
    object: T,
  ): Promise<S> {
    return this.zService.objectToModel(model, object)
  }

  async entitiesToModels<T extends BaseEntity, S extends BaseModel>(
    model: new () => S,
    entities: Loaded<T, never>[],
  ): Promise<S[]> {
    const models: S[] = []
    for (const entity of entities) {
      const inst = await this.zService.entityToModel(model, entity)
      models.push(inst)
    }
    return models
  }

  async objectsToModels<T, S extends BaseModel>(model: new () => S, objects: T[]): Promise<S[]> {
    const models: S[] = []
    for (const obj of objects) {
      const inst = await this.zService.objectToModel(model, obj)
      models.push(inst)
    }
    return models
  }

  async paginationArgs<T extends IPaginationArgs>(
    cls: ClassConstructor<T> & { schema: PaginationArgsSchema },
    argsObj: T,
  ): Promise<[T, CursorOptions<any>]> {
    const result = await cls.schema.safeParseAsync(argsObj)
    if (!result.success) {
      throw result.error
    }
    const args = plainToInstance(cls, result.data)
    const where: ObjectQuery<any> = {}
    const orderByField = args.orderBy()[0] || 'id'
    const isRelevance = orderByField === 'relevance'
    let decoded = ''
    if (args.after || args.before) {
      try {
        decoded = Buffer.from((args.after || args.before) as string, 'base64').toString('utf8')
      } catch (e) {
        throw new GraphQLError('Invalid cursor')
      }
    }
    let orderDirection = args.orderDir()[0] || 'ASC'
    const cmp =
      (args.after && orderDirection === 'ASC') || (args.before && orderDirection === 'DESC')
        ? '$gte'
        : '$lte'
    if (isRelevance) {
      if (args.after || args.before) {
        let parsed: { order: number | null; id: string }
        try {
          parsed = JSON.parse(decoded)
        } catch (e) {
          throw new GraphQLError('Invalid cursor')
        }
        const cursorOrder = parsed.order ?? 0
        where[raw(`(rank_order, id)`)] = { [cmp]: raw(`(?, ?)`, [cursorOrder, parsed.id]) }
      }
    } else if (args.after || args.before) {
      where[orderByField] = { [cmp]: decoded }
    }
    if (args.before || args.last) {
      // Need to flip order direction, then reverse the results
      orderDirection =
        orderDirection === OrderDirection.DESC ? OrderDirection.ASC : OrderDirection.DESC
    }
    const options: CursorOptions<any> = {
      where,
      options: {
        orderBy: isRelevance
          ? ([{ rankOrder: orderDirection }, { id: orderDirection }] as any)
          : ({
              [orderByField]: orderDirection,
            } as QueryOrderMap<any>),
        limit: (args.first || args.last || DEFAULT_PAGE_SIZE) + 2,
      },
    }
    return [args, options]
  }

  async applySearchQuery<T extends object>(
    entity: EntityName<T>,
    cursorOpts: CursorOptions<T>,
    queryFields: Record<string, QueryField>,
    args: any,
  ): Promise<CursorOptions<T>> {
    if (!args.query) {
      return cursorOpts
    }

    const parser = new SearchQueryParser()
    const ast = parser.parse(args.query)

    if (ast) {
      const meta = this.em.getMetadata().get(typeof entity === 'string' ? entity : entity.name)
      this.validateSearchAST(ast, queryFields, meta)
      const translator = new SearchQueryTranslator()
      const fieldMap = Object.keys(queryFields).reduce(
        (acc, key) => {
          const qf = queryFields[key]
          if (qf.dbField) {
            acc[key] = qf.dbField
          }
          return acc
        },
        {} as Record<string, string>,
      )
      const prefixFields = Object.keys(queryFields).filter((key) => queryFields[key].prefix)

      const translated = translator.translate(ast, {
        fieldMap,
        prefixFields,
      })

      if (Object.keys(translated).length > 0) {
        cursorOpts.where = {
          $and: [cursorOpts.where, translated],
        } as any
      }
    }

    return cursorOpts
  }

  private validateSearchAST(
    node: ASTNode,
    queryFields: Record<string, QueryField>,
    meta?: EntityMetadata,
  ) {
    if (node.type === 'AND' || node.type === 'OR') {
      this.validateSearchAST(node.left, queryFields, meta)
      this.validateSearchAST(node.right, queryFields, meta)
    } else if (node.type === 'NOT') {
      this.validateSearchAST(node.node, queryFields, meta)
    } else if (node.type === 'TERM') {
      throw BadRequestErr('Default free-text search is not supported')
    } else if (node.type === 'FIELD') {
      const qf = queryFields[node.field]
      if (!qf) {
        throw BadRequestErr(`Query field "${node.field}" is not supported`)
      }
      if (qf.operators && !qf.operators.includes(node.comparator)) {
        throw BadRequestErr(
          `Operator "${node.comparator}" is not supported for field "${node.field}"`,
        )
      }
      if (meta && qf.dbField) {
        const parts = qf.dbField.split('.')
        let currentMeta = meta
        for (let i = 0; i < parts.length; i++) {
          const part = parts[i]
          const prop = currentMeta.properties[part]
          if (!prop) {
            throw BadRequestErr(
              `Database field "${qf.dbField}" for query field "${node.field}" does not exist on ${currentMeta.className}`,
            )
          }
          if (prop.ref && i < parts.length - 1) {
            const targetMeta = this.em.getMetadata().get(prop.type)
            if (targetMeta) {
              currentMeta = targetMeta
            }
          }
        }
      }
    }
  }

  async entityToPaginated<T extends BaseEntity, U extends BaseModel, S extends PaginatedType<U>>(
    model: new () => U,
    PageModel: new () => S,
    cursor: Cursor<T, '*'>,
    options: IPaginationArgs,
  ): Promise<PaginatedType<U>> {
    const page: S = new PageModel()
    const nodes: U[] = []
    const edges: EdgeType<U>[] = []
    const flip = options.before || options.last
    cursor.items = flip ? cursor.items.reverse() : cursor.items
    for (const item of cursor.items) {
      const cls = await this.zService.entityToModel(model, item)
      nodes.push(cls)
      const orderByField = options.orderBy()[0] || 'id'
      const itemOrderField =
        orderByField === 'relevance'
          ? JSON.stringify({ order: (item as any).rankOrder ?? 0, id: (item as any).id })
          : (item as any)[orderByField]
      const cid = Buffer.from(
        _.isString(itemOrderField) ? itemOrderField : itemOrderField.id,
      ).toString('base64')
      edges.push({ cursor: cid, node: cls })
    }
    const pageSize = options.first || options.last || DEFAULT_PAGE_SIZE
    let hasPreviousPage = false
    let hasNextPage = false
    let extraNode = false
    if (edges.length === pageSize + 2) {
      const idx = flip ? edges.length - 1 : 0
      if (edges[idx].cursor === (options.after || options.before)) {
        hasPreviousPage = true
        hasNextPage = true
      } else {
        hasNextPage = !!options.first
        hasPreviousPage = !!options.last
        extraNode = true
      }
    } else if (edges.length <= pageSize + 1 && edges.length > 0) {
      const idx = flip ? edges.length - 1 : 0
      if (edges[idx].cursor === (options.after || options.before)) {
        hasPreviousPage = !!options.after
        hasNextPage = !!options.before
      } else if (edges.length > pageSize) {
        hasNextPage = !!options.first
        hasPreviousPage = !!options.last
      }
    }
    if (hasPreviousPage) {
      edges.shift()
      nodes.shift()
      if (extraNode) {
        edges.shift()
        nodes.shift()
      }
    }
    if (hasNextPage) {
      edges.pop()
      nodes.pop()
      if (extraNode) {
        edges.pop()
        nodes.pop()
      }
    }
    page.edges = edges
    page.nodes = nodes
    page.totalCount = cursor.count
    page.pageInfo = {
      startCursor: edges[0]?.cursor,
      endCursor: edges[edges.length - 1]?.cursor,
      hasPreviousPage,
      hasNextPage,
    }
    return page
  }

  async loadCursor<T extends BaseEntity>(
    em: EntityManager,
    entity: new () => T,
    relation: string,
    opts: CursorOptions<T>,
  ): Promise<Cursor<T, '*'>> {
    const [items, totalCount] = await em.findAndCount(entity, opts.where, opts.options)
    return {
      items,
      count: totalCount,
    }
  }

  async objectsToPaginated<T, S extends PaginatedType<any>>(
    PageModel: new () => S,
    cursor: { items: EntityDTO<T>[]; count: number },
    skipTransform?: boolean,
  ): Promise<PaginatedType<any>> {
    const entities: any[] = []
    if (skipTransform) {
      entities.push(...cursor.items)
    } else {
      for (const obj of cursor.items) {
        if (!(obj as any)._type) {
          continue
        }
        const inst = _.isPlainObject(obj)
          ? await this.zService.objectToModel((obj as any)._type, obj)
          : await this.zService.entityToModel((obj as any)._type, obj as any)
        ;(inst as any)._type = (obj as any)._type
        entities.push(inst)
      }
    }
    const page = new PageModel()
    page.edges = entities.map((node) => ({
      cursor: Buffer.from(node.id || '').toString('base64'),
      node,
    }))
    page.nodes = entities
    page.totalCount = cursor.count
    page.pageInfo = {
      hasPreviousPage: entities.length < cursor.count,
      hasNextPage: false,
    }
    return page
  }

  async entitiesToOffsetPaginated<
    T extends BaseEntity,
    U extends BaseModel,
    S extends PaginatedType<U>,
  >(
    model: new () => U,
    PageModel: new () => S,
    cursor: Cursor<T, '*'>,
    options: { limit?: number; offset?: number },
  ): Promise<PaginatedType<U>> {
    const items = await this.entitiesToModels(model, cursor.items)
    return await this.objectsToOffsetPaginated(
      PageModel,
      { items, count: cursor.count },
      options,
      true,
    )
  }

  async objectsToOffsetPaginated<T, S extends PaginatedType<any>>(
    PageModel: new () => S,
    cursor: { items: EntityDTO<T>[]; count: number },
    options: { limit?: number; offset?: number },
    skipTransform?: boolean,
  ): Promise<PaginatedType<any>> {
    const entities: any[] = []
    if (skipTransform) {
      entities.push(...cursor.items)
    } else {
      for (const obj of cursor.items) {
        if (!(obj as any)._type) {
          continue
        }
        const inst = _.isPlainObject(obj)
          ? await this.zService.objectToModel((obj as any)._type, obj)
          : await this.zService.entityToModel((obj as any)._type, obj as any)
        ;(inst as any)._type = (obj as any)._type
        entities.push(inst)
      }
    }

    const offset = options.offset ?? 0
    const page = new PageModel()
    page.edges = entities.map((node, index) => ({
      cursor: Buffer.from(String(offset + index)).toString('base64'),
      node,
    }))
    page.nodes = entities
    page.totalCount = cursor.count
    page.pageInfo = {
      startCursor: page.edges[0]?.cursor,
      endCursor: page.edges[page.edges.length - 1]?.cursor,
      hasPreviousPage: offset > 0,
      hasNextPage: offset + entities.length < cursor.count,
    }
    return page
  }
}

export function transformUnion(field: string): (params: TransformFnParams) => object {
  return (params: TransformFnParams) => {
    const obj = params.obj as any
    if (!obj || !obj[field]) {
      return {}
    }
    const constr = ModelRegistry[obj[field]]
    if (!constr) {
      throw new Error(`Model ${obj[field]} not found in registry`)
    }
    params.value._lang = params.obj._lang || []
    const instance = plainToInstance(constr, params.value, {
      lang: params.obj._lang,
    } as ClassTransformOptions)
    specialCases(instance, params.value)
    return instance
  }
}

function specialCases(instance: any, obj: any) {
  // Transform special cases like translation objects
  _.each(obj, (value, key) => {
    if (_.has(instance, key) && instance[key] instanceof BaseModel) {
      _.each(value, (v, k) => {
        if (k.endsWith('Tr')) {
          ;(instance[key] as any)[k] = v
        }
      })
    }
    if (key.endsWith('Tr')) {
      ;(instance as any)[key] = value
    }
  })
  if ((instance as any).transform) {
    ;(instance as any).transform(obj)
  }
  callTransform(instance, obj)
}

function callTransform(obj: any, src: any, depth = 0, maxDepth = 5) {
  if (!obj || depth > maxDepth) return

  // If the object itself has a transform method, call it
  if (typeof obj.transform === 'function') {
    obj.transform(src)
  }

  // Iterate over all properties
  for (const key of Object.keys(obj)) {
    const value = obj[key]
    const srcValue = src ? src[key] : undefined

    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        callTransform(value[i], srcValue ? srcValue[i] : undefined, depth + 1, maxDepth)
      }
    } else if (value && typeof value === 'object') {
      callTransform(value, srcValue, depth + 1, maxDepth)
    }
  }
}
