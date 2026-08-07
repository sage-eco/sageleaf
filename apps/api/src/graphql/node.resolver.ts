import { Args, ID, Query, Resolver } from '@nestjs/graphql'

import { OptionalAuth } from '@src/auth/decorators'
import { Change } from '@src/changes/change.model'
import { Source } from '@src/changes/source.model'
import { MetaService } from '@src/common/meta.service'
import { TransformService } from '@src/common/transform'
import { FeedItem } from '@src/feed/home-feed.model'
import { Place } from '@src/geo/place.model'
import { Region } from '@src/geo/region.model'
import { fromGlobalId } from '@src/graphql/global-id'
import { Node } from '@src/graphql/node.model'
import { Component } from '@src/process/component.model'
import { Material } from '@src/process/material.model'
import { Process } from '@src/process/process.model'
import { Program } from '@src/process/program.model'
import { Tag } from '@src/process/tag.model'
import { Category } from '@src/product/category.model'
import { Item } from '@src/product/item.model'
import { Variant } from '@src/product/variant.model'
import { Org } from '@src/users/org.model'
import { User } from '@src/users/users.model'

interface NodeTypeEntry {
  entityKey: string
  Model: new () => any
}

const NODE_TYPES: Record<string, NodeTypeEntry> = {
  Item: { entityKey: 'Item', Model: Item },
  Variant: { entityKey: 'Variant', Model: Variant },
  Place: { entityKey: 'Place', Model: Place },
  Region: { entityKey: 'Region', Model: Region },
  Category: { entityKey: 'Category', Model: Category },
  Material: { entityKey: 'Material', Model: Material },
  Component: { entityKey: 'Component', Model: Component },
  Process: { entityKey: 'Process', Model: Process },
  Program: { entityKey: 'Program', Model: Program },
  Org: { entityKey: 'Org', Model: Org },
  Tag: { entityKey: 'Tag', Model: Tag },
  FeedItem: { entityKey: 'HomeFeed', Model: FeedItem },
  Change: { entityKey: 'Change', Model: Change },
  Source: { entityKey: 'Source', Model: Source },
  User: { entityKey: 'User', Model: User },
}

@Resolver(() => Node)
export class NodeResolver {
  constructor(
    private readonly metaService: MetaService,
    private readonly transform: TransformService,
  ) {}

  @Query(() => Node, { name: 'node', nullable: true })
  @OptionalAuth()
  async node(@Args('id', { type: () => ID }) id: string): Promise<any> {
    const parsed = fromGlobalId(id)
    if (!parsed) return null
    const typeEntry = NODE_TYPES[parsed.type]
    if (!typeEntry) return null
    const svcResult = this.metaService.findEntityService(typeEntry.entityKey)
    if (!svcResult) return null
    const [, service] = svcResult
    let entity: any
    try {
      entity = await service.findOneByID(parsed.id)
    } catch {
      return null
    }
    if (!entity) return null
    const model = await this.transform.entityToModel(typeEntry.Model, entity)
    ;(model as any)._type = parsed.type
    return model
  }

  @Query(() => [Node], { name: 'nodes', nullable: 'items' })
  @OptionalAuth()
  async nodes(@Args('ids', { type: () => [ID] }) ids: string[]): Promise<any[]> {
    const parsedIds = ids.map((id) => fromGlobalId(id))

    const bareIdsByEntityKey = new Map<string, string[]>()
    for (const parsed of parsedIds) {
      if (!parsed) continue
      const typeEntry = NODE_TYPES[parsed.type]
      if (!typeEntry) continue
      const list = bareIdsByEntityKey.get(typeEntry.entityKey) ?? []
      list.push(parsed.id)
      bareIdsByEntityKey.set(typeEntry.entityKey, list)
    }

    const entityByEntityKeyById = new Map<string, Map<string, any>>()
    for (const [entityKey, bareIds] of bareIdsByEntityKey.entries()) {
      const svcResult = this.metaService.findEntityService(entityKey)
      if (!svcResult) continue
      const [, service] = svcResult
      const entities = await service.findManyByID(bareIds)
      entityByEntityKeyById.set(entityKey, new Map(entities.map((e: any) => [e.id, e])))
    }

    const result: any[] = []
    for (const parsed of parsedIds) {
      const typeEntry = parsed ? NODE_TYPES[parsed.type] : undefined
      const entity = typeEntry
        ? entityByEntityKeyById.get(typeEntry.entityKey)?.get(parsed!.id)
        : undefined
      if (!parsed || !typeEntry || !entity) {
        result.push(null)
        continue
      }
      const model = await this.transform.entityToModel(typeEntry.Model, entity)
      ;(model as any)._type = parsed.type
      result.push(model)
    }
    return result
  }
}
