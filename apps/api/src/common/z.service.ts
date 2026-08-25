import { BaseEntity, Loaded, Ref } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'
import _ from 'lodash'
import { z, ZodObject } from 'zod/v4'

import { I18nService } from '@src/common/i18n.service'
import { BaseModel, ModelRegistry } from '@src/graphql/base.model'

type TransformMeta = { entity?: string; model: string }

type ZTransformInput = { input: z.ZodUnknown; i18n: z.ZodCustom<I18nService, I18nService> }
type TransformSchema<M> = z.ZodPipe<z.ZodObject<ZTransformInput>, z.ZodTransform<M, TransformInput>>

function transformKey(entity: string | undefined, model: string): string {
  return `${entity ?? ''}:${model}`
}

function isRef<E extends BaseEntity>(value: unknown): value is Ref<E> {
  return _.isFunction((value as Ref<E> | undefined)?.isInitialized)
}

export type TransformInput = {
  input: unknown
  i18n: I18nService
}

@Injectable()
export class ZService {
  private transformRegistry
  private transformMap: Map<string, TransformSchema<any>>
  private transformInputSchema: z.ZodObject<ZTransformInput>

  constructor(private readonly i18n: I18nService) {
    this.transformRegistry = z.registry<TransformMeta, TransformSchema<any>>()
    this.transformMap = new Map()
    this.transformInputSchema = z.object({
      input: z.unknown(),
      i18n: z.instanceof(I18nService),
    })
  }

  registerObjectTransform<M extends BaseModel>(
    model: new () => M,
    transform: z.ZodTransform<M, TransformInput>,
  ) {
    const modelKey = model.prototype.constructor.name
    const tr = this.transformInputSchema.pipe(transform as unknown as z.ZodTransform<any, any>)
    this.transformRegistry.add(tr, { entity: undefined, model: modelKey })
    this.transformMap.set(transformKey(undefined, modelKey), tr)
  }

  registerEntityTransform<E extends BaseEntity, M extends BaseModel>(
    entity: (new () => E) | string,
    model: new () => M | string,
    transform: z.ZodTransform<M, TransformInput>,
  ) {
    const [entityKey, modelKey] = [
      typeof entity === 'string' ? entity : entity ? entity.prototype.constructor.name : undefined,
      typeof model === 'string' ? model : model.prototype.constructor.name,
    ]
    const tr = this.transformInputSchema.pipe(transform as unknown as z.ZodTransform<any, any>)
    this.transformRegistry.add(tr, { entity: entityKey, model: modelKey })
    this.transformMap.set(transformKey(entityKey, modelKey), tr)
    // Also register with model-only key for objectToModel lookups
    if (entityKey !== undefined) {
      this.transformMap.set(transformKey(undefined, modelKey), tr)
    }
  }

  private async transformToModel<M extends BaseModel>(
    Model: new () => M,
    input: Loaded<any, never> | object,
    transform: TransformSchema<any>,
  ): Promise<M> {
    const result = await transform.safeParseAsync({ input, i18n: this.i18n }, { reportInput: true })
    if (!result.success) {
      result.error.cause = new Error(
        input.constructor
          ? `Failed to parse entity ${input.constructor.name} to model ${Model.prototype.constructor.name}`
          : `Failed to parse object to model ${Model.prototype.constructor.name}`,
      )
      throw result.error
    }
    return result.data
  }

  async entityToModel<E extends BaseEntity, M extends BaseModel>(
    Model: (new () => M) | string,
    entity: Loaded<E, never> | Ref<E>,
  ): Promise<M> {
    const model: (new () => M) | undefined =
      typeof Model === 'string' ? (ModelRegistry[Model] as (new () => M) | undefined) : Model
    if (!model) {
      throw new Error(`No model registered for ${Model}`)
    }
    if (_.isPlainObject(entity)) {
      throw new Error(
        `Called entityToModel with plain object value: ${typeof entity}. You should probably call objectToModel instead`,
      )
    }
    if (!entity.isInitialized()) {
      throw new Error(`Entity is not initialized: ${entity.constructor.name}`)
    }
    const transform = this.transformMap.get(
      transformKey(entity.constructor.name, model.prototype.constructor.name),
    )
    if (!transform) {
      throw new Error(
        `No transform registered for entity ${entity.constructor.name} and model ${model.prototype.constructor.name}`,
      )
    }
    const result = await this.transformToModel<M>(model, entity, transform)
    // Preserve reference to original entity (used by field resolvers that need the entity)
    // ;(result as BaseModel).entity = entity
    return result
  }

  /**
   * Resolves a lazy MikroORM `Ref<E>` relation (loading it from the DB if not
   * already populated) and transforms it to its GraphQL model. Use this instead of
   * passing `entity.someRef` straight to `entityToModel`, which throws if the ref
   * hasn't been populated.
   *
   * Also accepts a bare id or `{ id }`, which is what a relation looks like once an
   * entity has been flattened to a plain diff object (e.g. change/edit history) —
   * there's no entity to load in that case, so this returns a stub model with only
   * `id` set.
   */
  async refToModel<E extends BaseEntity, M extends BaseModel & { id: string }>(
    Model: (new () => M) | string,
    ref: Ref<E> | string | { id: string } | null | undefined,
  ): Promise<M | undefined> {
    if (!ref) {
      return undefined
    }
    if (!isRef<E>(ref)) {
      return this.idOnlyModel(Model, _.isString(ref) ? ref : ref.id)
    }
    const entity = ref.isInitialized() ? ref.getEntity() : await ref.load()
    return entity ? this.entityToModel(Model, entity) : undefined
  }

  private idOnlyModel<M extends BaseModel & { id: string }>(
    Model: (new () => M) | string,
    id: string | undefined,
  ): M | undefined {
    if (!id) {
      return undefined
    }
    const ModelClass: (new () => M) | undefined = _.isString(Model)
      ? (ModelRegistry[Model] as (new () => M) | undefined)
      : Model
    if (!ModelClass) {
      throw new Error(`No model registered for ${Model}`)
    }
    const stub = new ModelClass()
    stub.id = id
    return stub
  }

  /**
   * Builds an id-only stub model from a relation value, without loading anything.
   * Accepts a MikroORM `Ref<E>` or an already-loaded entity (both expose `.id`
   * synchronously via their proxy, no DB round-trip needed), a bare string id, or a
   * `{ id }` object (the shape a relation takes once flattened into a POJO diff,
   * e.g. change/edit history).
   *
   * Use this for relation fields that only need their `id` carried onto the model
   * (e.g. for a GraphQL field resolver to lazily resolve later) — unlike
   * `refToModel`, this never triggers a DB load, so it's safe to use with
   * unpersisted/staged entities (e.g. change-tracking flows).
   */
  idRefToModel<M extends BaseModel & { id: string }>(
    Model: (new () => M) | string,
    ref: Ref<any> | BaseEntity | string | { id: string } | null | undefined,
  ): M | undefined {
    if (!ref) {
      return undefined
    }
    const id = _.isString(ref) ? ref : (ref as { id: string }).id
    return this.idOnlyModel(Model, id)
  }

  async objectToModel<T, S extends BaseModel>(
    Model: (new () => S) | string,
    object: T,
  ): Promise<S> {
    const model: (new () => S) | undefined =
      typeof Model === 'string' ? (ModelRegistry[Model] as (new () => S) | undefined) : Model
    if (!model) {
      throw new Error(`No model registered for ${Model}`)
    }
    if (!_.isPlainObject(object)) {
      throw new Error(
        `Called objectToModel with non-object value: ${typeof object}. You should probably call entityToModel instead`,
      )
    }
    const transform = this.transformMap.get(
      transformKey(undefined, model.prototype.constructor.name),
    )
    if (!transform) {
      throw new Error(
        `No object transform registered for model ${model.prototype.constructor.name}`,
      )
    }
    return this.transformToModel(model, object, transform)
  }

  async parse<S extends z.ZodObject>(schema: S, input: z.input<S>): Promise<z.output<S>> {
    if (schema instanceof ZodObject) {
      return schema.parseAsync(input)
    }
    throw new Error('Unsupported schema type')
  }
}
