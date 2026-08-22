import { BaseEntity, EntityManager, ref, wrap } from '@mikro-orm/postgresql'
import type {
  Collection,
  EntityDTO,
  EntityMetadata,
  EntityName,
  FilterQuery,
  FindOneOptions,
  Loaded,
  Reference,
  RequiredEntityData,
} from '@mikro-orm/postgresql'
import { Injectable, NotFoundException } from '@nestjs/common'
import _ from 'lodash'

import { AuthUserService } from '@src/auth/authuser.service'
import {
  CreateChangeInput,
  DeleteInput,
  IChangeInputWithLang,
  isUsingChange,
} from '@src/changes/change-ext.model'
import { Change, ChangeEdits, ChangeStatus } from '@src/changes/change.entity'
import { OpType } from '@src/changes/change.enum'
import { MergeConflict, MergeInput, RefNode } from '@src/changes/change.model'
import { Source } from '@src/changes/source.entity'
import { BadRequestErr, NotFoundErr } from '@src/common/exceptions'
import { isExcludedFromDiff } from '@src/common/exclude-from-diff.decorator'
import { MetaService } from '@src/common/meta.service'
import { toGlobalId } from '@src/graphql/global-id'
import { User } from '@src/users/users.entity'

export interface IEntityService {
  findOneByID<T extends BaseEntity>(id: string): Promise<T | null>
}

type PivotInput = { id: string; [key: string]: any } | { id: string; [key: string]: any }[]
type ChangeRef<T extends BaseEntity & { id: string }> = { id: string } & Reference<Loaded<T>>

@Injectable()
export class EditService {
  constructor(
    private readonly em: EntityManager,
    private readonly authUser: AuthUserService,
    private readonly metaService: MetaService,
  ) {}

  async persistChange(change: Change): Promise<void> {
    const fork = this.em.fork()
    await fork.persist(change).flush()
  }

  /**
   * Reads an entity in a way that avoids autoflushing staged edits during change-mode mutations.
   *
   * Use this in services when you need a "current DB state" snapshot while a `change` may still hold
   * detached entities or pending pivot mutations in the primary entity manager.
   */
  async findOneForChange<T extends BaseEntity, H extends string = never>(
    em: EntityManager,
    change: Change | undefined,
    model: EntityName<T>,
    where: FilterQuery<T>,
    options?: FindOneOptions<T, H, '*', never>,
  ): Promise<Loaded<T, H, '*', never> | null> {
    const reader = change ? em.fork() : em
    return reader.findOne<T, H>(model, where as FilterQuery<T>, options) as Promise<Loaded<
      T,
      H,
      '*',
      never
    > | null>
  }

  async findOne(id: string) {
    const change = await this.em.findOne(Change, { id }, { populate: ['user', 'sources', 'edits'] })

    if (!change) {
      throw new NotFoundException(`Change with ID "${id}" not found`)
    }

    return change
  }

  async findOneOrCreate(id?: string, input?: CreateChangeInput, userID?: string) {
    if (!id && !input) {
      throw NotFoundErr('Must provide either a Change ID or Change input')
    }
    if (id && input) {
      throw BadRequestErr('Cannot provide both a Change ID and Change input')
    }
    if (!userID) {
      throw BadRequestErr('Must provide a user ID')
    }

    if (id) {
      const change = await this.em.findOne(
        Change,
        { id },
        { populate: ['edits', 'user', 'sources'] },
      )
      if (!change) {
        throw NotFoundErr(`Change with ID "${id}" not found`)
      }
      if (!this.authUser.sameUserOrAdmin(change.user.id)) {
        throw BadRequestErr('You can only edit your own changes')
      }
      return change
    }

    const newChange = await this.create(input!, userID)
    return newChange
  }

  async findEntityEdits<T extends BaseEntity>(
    changeID: string,
    entity: EntityName<T>,
  ): Promise<ChangeEdits[]> {
    const change = await this.em.findOne(Change, { id: changeID }, { populate: ['edits'] })
    if (!change) {
      throw NotFoundErr(`Change with ID "${changeID}" not found`)
    }
    return change.edits.filter((edit) => edit.entityName === entity.toString())
  }

  async create(input: CreateChangeInput, userID: string) {
    const change = new Change()
    change.title = input.title
    change.description = input.description
    change.user = ref(User, userID)
    change.status = input.status || ChangeStatus.DRAFT

    if (input.sources && input.sources.length > 0) {
      const sources = await this.em.find(
        Source,
        {
          id: { $in: input.sources },
        },
        { fields: ['id'] },
      )
      for (const source of sources) {
        change.sources.add(ref(source.id))
      }
    }

    await this.em.persist(change).flush()
    return change
  }

  /**
   * Applies set/add operations for simple entity collections (no explicit pivot payload).
   *
   * In change mode, this validates referenced IDs against staged edits or persisted rows via
   * `findRefWithChange`, then attaches lightweight references so services can compose pending edits.
   * In direct mode, it validates against the database and mutates the managed collection normally.
   *
   * Use this for relation fields that only need target IDs and do not require pivot metadata.
   */
  async setOrAddCollection<T extends BaseEntity & { id: string }, U extends { id: string }>(
    collection: Collection<T>,
    entity: EntityName<T>,
    toSet?: U | U[],
    toAdd?: U | U[],
    change?: Change,
  ): Promise<Collection<T>> {
    if (toSet) {
      if (Array.isArray(toSet)) {
        if (change) {
          const ids = toSet.map((item) => item.id)
          const refs: ChangeRef<T>[] = []
          for (const id of ids) {
            refs.push(await this.findRefWithChange(change, entity, { id } as any))
          }
          collection.set(refs)
        } else {
          const foundItems = await this.em.find(
            entity,
            { id: { $in: toSet.map((item) => item.id) } } as any,
            { populate: false },
          )
          if (foundItems.length !== toSet.length) {
            const foundIds = foundItems.map((item) => item.id)
            throw NotFoundErr(
              `No ${entity} found for IDs: ${toSet
                .map((item) => item.id)
                .filter((id) => !_.includes(foundIds, id))
                .join(', ')}`,
            )
          }
          collection.set(foundItems)
        }
      } else {
        if (change) {
          const ref = await this.findRefWithChange(change, entity, { id: toSet.id } as any)
          collection.set([ref])
        } else {
          const foundItem = await this.em.findOne(entity, { id: toSet.id } as any, {
            populate: false,
          })
          if (!foundItem) {
            throw NotFoundErr(`No ${entity} found for ID: ${toSet.id}`)
          }
          collection.set([foundItem])
        }
      }
    }
    if (toAdd) {
      if (Array.isArray(toAdd)) {
        if (change) {
          const ids = toAdd.map((item) => item.id)
          const refs: ChangeRef<T>[] = []
          for (const id of ids) {
            refs.push(await this.findRefWithChange(change, entity, { id } as any))
          }
          collection.add(refs)
        } else {
          const foundItems = await this.em.find(
            entity,
            { id: { $in: toAdd.map((item) => item.id) } } as any,
            { populate: false },
          )
          if (foundItems.length !== toAdd.length) {
            const foundIds = foundItems.map((item) => item.id)
            throw NotFoundErr(
              `No ${entity} found for IDs: ${toAdd
                .map((item) => item.id)
                .filter((id) => !_.includes(foundIds, id))
                .join(', ')}`,
            )
          }
          collection.add(foundItems)
        }
      } else {
        if (change) {
          const ref = await this.findRefWithChange(change, entity, { id: toAdd.id } as any)
          collection.add(ref)
        } else {
          const foundItem = await this.em.findOne(entity, { id: toAdd.id } as any, {
            populate: false,
          })
          if (!foundItem) {
            throw NotFoundErr(`No ${entity} found for ID: ${toAdd.id}`)
          }
          collection.add(foundItem)
        }
      }
    }
    return collection
  }

  /**
   * Removes members from a simple entity collection by ID.
   *
   * In change mode, removal is performed against the in-memory collection only so staged edits can
   * remove references to entities that may not yet exist in the database. In direct mode, IDs are
   * validated in the database before removal.
   *
   * Use this together with `setOrAddCollection` for non-pivot relation updates.
   */
  async removeFromCollection<T extends BaseEntity & { id: string }>(
    collection: Collection<T>,
    entity: EntityName<T>,
    toRemove?: string | string[],
    change?: Change,
  ): Promise<Collection<T>> {
    if (toRemove) {
      if (Array.isArray(toRemove)) {
        if (change) {
          if (!collection.isInitialized()) {
            await collection.init({ ref: true })
          }
          const idSet = new Set(toRemove)
          const foundItems = collection.getItems().filter((item) => idSet.has(item.id))
          collection.remove(foundItems)
        } else {
          const foundItems = await this.em.find(entity, { id: { $in: toRemove } } as any, {
            populate: false,
          })
          if (foundItems.length !== toRemove.length) {
            const foundIds = foundItems.map((item) => item.id)
            throw NotFoundErr(
              `No ${entity} found for IDs: ${toRemove
                .filter((id) => !_.includes(foundIds, id))
                .join(', ')}`,
            )
          }
          collection.remove(foundItems)
        }
      } else {
        if (change) {
          if (!collection.isInitialized()) {
            await collection.init({ ref: true })
          }
          const foundItem = collection.getItems().find((item) => item.id === toRemove)
          if (foundItem) {
            collection.remove(foundItem)
          }
        } else {
          const foundItem = await this.em.findOne(entity, { id: toRemove } as any, {
            populate: false,
          })
          if (!foundItem) {
            throw NotFoundErr(`No ${entity} found for ID: ${toRemove}`)
          }
          collection.remove(foundItem)
        }
      }
    }
    return collection
  }

  /**
   * Applies set/add operations for relations represented by an explicit pivot entity.
   *
   * The method derives owner and related fields from pivot metadata, validates related IDs, and
   * creates/reuses pivot rows. When `toAdd` contains extra properties, those values are assigned to
   * the pivot row (for example quantity/unit or role metadata).
   *
   * Use this for many-to-many style relations modeled with pivot entities that can carry additional
   * fields beyond foreign keys.
   */
  async setOrAddPivot<U extends BaseEntity & { id: string }, T extends object>(
    id: string,
    change: Change | undefined,
    collection: Collection<T>,
    collEntity: EntityName<U>,
    pivotEntity: EntityName<T>,
    toSet?: PivotInput,
    toAdd?: PivotInput,
  ): Promise<Collection<T>> {
    const pivotMeta = this.em.getMetadata().get(pivotEntity)
    const pivotEntityStr = pivotMeta.name
    const collEntityStr = this.em.getMetadata().get(collEntity).name
    if (!pivotEntityStr || !collEntityStr) {
      throw new Error(`Bad pivot entities: ${pivotEntityStr}, ${collEntityStr}`)
    }
    let collField: string | undefined
    let relField: string | undefined
    let relEntity: EntityName<U> | undefined
    for (const prop of pivotMeta.primaryKeys) {
      const target = pivotMeta.properties[prop].targetMeta
      if (!target) {
        throw new Error(`No target meta found for property: ${prop}`)
      }
      if (target.name !== collEntityStr) {
        relField = prop
        relEntity = target.className as EntityName<U>
      } else {
        collField = prop
      }
    }
    if (!collField || !relField || !relEntity) {
      throw new Error(
        `Could not determine collection field or relation field for pivot entity: ${pivotEntityStr}`,
      )
    }
    const createPivotRow = (data: Record<string, unknown>) =>
      this.em.create(pivotEntity, data as any, { persist: false })
    if (toSet) {
      if (Array.isArray(toSet) && toSet.length > 0) {
        if (change) {
          for (const item of toSet) {
            await this.findRefWithChange(change, relEntity, { id: item.id } as any)
          }
        } else {
          const foundItems = await this.em.find(
            relEntity,
            { id: { $in: toSet.map((item) => item.id) } } as any,
            { populate: false },
          )
          if (foundItems.length !== toSet.length) {
            const foundIds = foundItems.map((item) => item.id)
            throw NotFoundErr(
              `No ${relEntity} found for IDs: ${toSet
                .map((item) => item.id)
                .filter((id) => !_.includes(foundIds, id))
                .join(', ')}`,
            )
          }
        }
        const toSetEntities = toSet.map((item) => {
          const newEntity = createPivotRow({
            [collField]: id,
            [relField]: item.id,
            ..._.omit(item, 'id'),
          })
          if (!change) {
            this.em.persist(newEntity)
          }
          return newEntity
        })
        if (!collection.isInitialized()) {
          await collection.init({ ref: true })
        }
        const existing = collection.getItems()
        for (const pivotItem of existing) {
          collection.removeWithoutPropagation(pivotItem)
          if (!change) {
            this.em.remove(pivotItem)
          }
        }
        collection.add(toSetEntities)
      } else if (!Array.isArray(toSet) && toSet.id) {
        if (change) {
          await this.findRefWithChange(change, relEntity, { id: toSet.id } as any)
        } else {
          const foundItem = await this.em.findOne(relEntity, { id: toSet.id } as any, {
            populate: false,
          })
          if (!foundItem) {
            throw NotFoundErr(`No ${relEntity} found for ID: ${toSet.id}`)
          }
        }
        const toSetEntity = createPivotRow({
          [collField]: id,
          [relField]: toSet.id,
          ..._.omit(toSet, 'id'),
        })
        if (!change) {
          this.em.persist(toSetEntity)
        }
        if (!collection.isInitialized()) {
          await collection.init({ ref: true })
        }
        const existing = collection.getItems()
        for (const pivotItem of existing) {
          collection.removeWithoutPropagation(pivotItem)
          if (!change) {
            this.em.remove(pivotItem)
          }
        }
        collection.add([toSetEntity])
      }
    }
    if (toAdd) {
      if (Array.isArray(toAdd) && toAdd.length > 0) {
        if (change) {
          for (const item of toAdd) {
            await this.findRefWithChange(change, relEntity, { id: item.id } as any)
          }
        } else {
          const foundItems = await this.em.find(
            relEntity,
            { id: { $in: toAdd.map((item) => item.id) } } as any,
            { populate: false },
          )
          if (foundItems.length !== toAdd.length) {
            const foundIds = foundItems.map((item) => item.id)
            throw NotFoundErr(
              `No ${relEntity} found for IDs: ${toAdd
                .map((item) => item.id)
                .filter((id) => !_.includes(foundIds, id))
                .join(', ')}`,
            )
          }
        }
        const toAddEntities: T[] = []
        for (const item of toAdd) {
          const existing = id
            ? !change
              ? await this.em.findOne(
                  pivotEntity,
                  { [collField]: id, [relField]: item.id } as any,
                  {
                    populate: false,
                  },
                )
              : null
            : null
          if (existing) {
            const extraFields = _.omit(item, 'id')
            if (Object.keys(extraFields).length > 0) {
              this.em.assign(existing, extraFields as any)
            }
            continue
          }
          const newEntity = createPivotRow({
            [collField]: id,
            [relField]: item.id,
            ..._.omit(item, 'id'),
          })
          if (!change) {
            this.em.persist(newEntity)
          }
          toAddEntities.push(newEntity)
        }
        if (toAddEntities.length > 0) {
          collection.add(toAddEntities)
        }
      } else if (!Array.isArray(toAdd) && toAdd.id) {
        if (change) {
          await this.findRefWithChange(change, relEntity, { id: toAdd.id } as any)
        } else {
          const foundItem = await this.em.findOne(relEntity, { id: toAdd.id } as any, {
            populate: false,
          })
          if (!foundItem) {
            throw NotFoundErr(`No ${relEntity} found for ID: ${toAdd.id}`)
          }
        }
        const existing = id
          ? !change
            ? await this.em.findOne(pivotEntity, { [collField]: id, [relField]: toAdd.id } as any, {
                populate: false,
              })
            : null
          : null
        if (existing) {
          const extraFields = _.omit(toAdd, 'id')
          if (Object.keys(extraFields).length > 0) {
            this.em.assign(existing, extraFields as any)
          }
        } else {
          const toAddEntity = createPivotRow({
            [collField]: id,
            [relField]: toAdd.id,
            ..._.omit(toAdd, 'id'),
          })
          if (!change) {
            this.em.persist(toAddEntity)
          }
          collection.add([toAddEntity])
        }
      }
    }
    return collection
  }

  /**
   * Removes pivot rows from an explicit pivot collection by related entity ID.
   *
   * In change mode, it removes rows from the staged in-memory collection without requiring database
   * presence of the related entity. In direct mode, IDs are validated and rows are scheduled for
   * deletion through the active entity manager.
   *
   * Use this for remove operations on pivot-backed relation fields.
   */
  async removeFromPivot<U extends BaseEntity & { id: string }, T extends object>(
    change: Change | undefined,
    collection: Collection<T>,
    collEntity: EntityName<U>,
    pivotEntity: EntityName<T>,
    toRemove?: string | string[],
  ): Promise<Collection<T>> {
    const pivotMeta = this.em.getMetadata().get(pivotEntity)
    const pivotEntityStr = pivotMeta.name
    const collEntityStr = this.em.getMetadata().get(collEntity).name
    if (!pivotEntityStr || !collEntityStr) {
      throw new Error(`Bad pivot entities: ${pivotEntityStr}, ${collEntityStr}`)
    }
    let collField: string | undefined
    let relField: string | undefined
    let relEntity: EntityName<U> | undefined
    for (const prop of pivotMeta.primaryKeys) {
      const target = pivotMeta.properties[prop].targetMeta
      if (!target) {
        throw new Error(`No target meta found for property: ${prop}`)
      }
      if (target.name !== collEntityStr) {
        relField = prop
        relEntity = target.className as EntityName<U>
      } else {
        collField = prop
      }
    }
    if (!collField || !relField || !relEntity) {
      throw new Error(
        `Could not determine collection field or relation field for pivot entity: ${pivotEntityStr}`,
      )
    }
    if (toRemove) {
      if (Array.isArray(toRemove)) {
        if (!collection.isInitialized()) {
          await collection.init({ ref: true })
        }
        if (!change) {
          const foundItems = await this.em.find(relEntity, { id: { $in: toRemove } } as any, {
            populate: false,
          })
          if (foundItems.length !== toRemove.length) {
            const foundIds = foundItems.map((item) => item.id)
            throw NotFoundErr(
              `No ${relEntity} found for IDs: ${toRemove
                .filter((id) => !_.includes(foundIds, id))
                .join(', ')}`,
            )
          }
        }
        const pivotItems = collection.getItems().filter((item: any) => {
          const itemRelId = item[relField]?.id || item[relField]
          return toRemove.includes(itemRelId)
        })
        for (const pivotItem of pivotItems) {
          collection.removeWithoutPropagation(pivotItem)
          if (!change) {
            this.em.remove(pivotItem)
          }
        }
      } else {
        if (!change) {
          const foundItem = await this.em.findOne(relEntity, { id: toRemove } as any, {
            populate: false,
          })
          if (!foundItem) {
            throw NotFoundErr(`No ${relEntity} found for ID: ${toRemove}`)
          }
        }
        if (!collection.isInitialized()) {
          await collection.init({ ref: true })
        }
        // Find the actual pivot entity to remove
        const pivotItem = collection.getItems().find((item: any) => {
          const itemRelId = item[relField]?.id || item[relField]
          return itemRelId === toRemove
        })
        if (pivotItem) {
          collection.removeWithoutPropagation(pivotItem)
          if (!change) {
            this.em.remove(pivotItem)
          }
        }
      }
    }
    return collection
  }

  /**
   * Resolves an entity reference while honoring staged edits in a change.
   *
   * Resolution order is: matching edit in the change, then persisted row in the database. If the
   * matching edit is a pending delete, this rejects the reference to prevent new relations to an
   * entity scheduled for removal.
   *
   * Use this in service `setFields` paths that must accept references created or updated in the same
   * change.
   */
  async findRefWithChange<T extends BaseEntity & { id: string }>(
    change: Change,
    model: EntityName<T>,
    where: FilterQuery<T> & { id: string },
    options?: FindOneOptions<T, never, '*', never>,
  ): Promise<ChangeRef<T>> {
    // First check if it exists in the change
    const entityName = this.em.getMetadata().get(model).name
    const edit = change.edits.find((e) => {
      if (e.entityName === entityName && e.entityID === where.id) {
        return true
      }
      return false
    })
    if (edit) {
      if (this.isPendingDeleteEdit(edit)) {
        throw BadRequestErr(
          `${entityName} with ID "${where.id}" is pending deletion in this change`,
        )
      }
      return this.em
        .fork()
        .getReference(model, edit.entityID as any, { wrapped: true }) as ChangeRef<T>
    }
    // If not, check if it exists in the database
    const fork = this.em.fork()
    const entity = await fork.findOne<T>(model, where as FilterQuery<T>, options)
    if (!entity) {
      throw NotFoundErr(`${entityName} with ID "${where.id}" not found`)
    }
    return fork.getReference(model, where.id as any, { wrapped: true }) as ChangeRef<T>
  }

  /**
   * Guards the direct (non-Change) branch of entity create() methods - only admins may create
   * entities without going through the Change/staged-edit workflow.
   *
   * Use this as the first statement inside `if (!isUsingChange(input))` in create() methods.
   */
  assertDirectCreateAllowed(): void {
    if (!this.authUser.admin()) {
      throw BadRequestErr('Admin privileges are required to directly create')
    }
  }

  /**
   * Loads the editable entity context for mutations that may run directly or through a change.
   *
   * Direct edits require admin privileges and return the persisted entity. Change edits resolve an
   * existing staged edit first (including reconstructed state from stored POJO), otherwise load from
   * the database and pair it with the resolved change.
   *
   * Use this as the standard entry point in update service methods that accept `changeID/change`.
   */
  async findOneWithChangeInput<T extends BaseEntity, H extends string>(
    input: IChangeInputWithLang,
    userID: string,
    model: EntityName<T>,
    where: FilterQuery<T> & { id: string },
    options?: FindOneOptions<T, H, '*', never>,
  ): Promise<{ entity: Loaded<T, never, '*', never>; change?: Change }> {
    if (!input.changeID && !input.change) {
      if (!this.authUser.admin()) {
        throw BadRequestErr('Admin privileges are required to directly edit')
      }
      const entity = await this.em.findOne<T, H>(model, where as FilterQuery<T>, options)
      return { entity: entity as Loaded<T> }
    }
    const change = await this.findOneOrCreate(input.changeID, input.change, userID)
    const meta = this.em.getMetadata().get(model)
    // First check if it exists in the change
    const edit = change.edits.find((e) => {
      if (e.entityName === meta.name && e.entityID === where.id) {
        return true
      }
      return false
    })
    if (edit) {
      if (this.isPendingDeleteEdit(edit)) {
        throw BadRequestErr(`${meta.name} with ID "${where.id}" is pending deletion in this change`)
      }
      if (edit.changes || edit.original) {
        const entity = edit.original
          ? this.em.create(model, (edit.changes || edit.original) as RequiredEntityData<T>, {
              managed: true,
              persist: false,
            })
          : await this.changePOJOToEntity(
              model,
              (edit.changes || edit.original) as Record<string, any>,
            )
        return { entity: entity as Loaded<T>, change }
      } else {
        throw NotFoundErr(`Edit for entity "${meta.name}" with ID "${where.id}" not found`)
      }
    }
    // If not, check if it exists in the database
    const findOptions = {
      ...options,
      disableIdentityMap: true,
    } as FindOneOptions<T, H, '*', never>
    const entity = await this.em.findOne<T, H>(model, where as FilterQuery<T>, findOptions)
    if (!entity) {
      throw NotFoundErr(`${meta.name} with ID "${where.id}" not found`)
    }
    return { entity: entity as Loaded<T>, change }
  }

  /**
   * Registers a delete operation as part of a change.
   *
   * If an edit already exists, this converts it to a delete (or discards create edits). If no edit
   * exists, it captures the current entity state as `original` so merge can apply deletion later.
   * Before scheduling delete, it checks for staged edits in the same change that still reference the
   * target entity.
   *
   * Use this from entity delete services that support change-based workflows.
   */
  async deleteOneWithChange<T extends BaseEntity & { id: string }>(
    input: DeleteInput,
    model: EntityName<T>,
  ) {
    const userID = this.authUser.userID()
    if (!userID) {
      throw BadRequestErr('User ID is required for delete operation')
    }
    const change = await this.findOneOrCreate(input.changeID, input.change, userID)
    if (!this.authUser.sameUserOrAdmin(change.user.id)) {
      throw BadRequestErr('You can only delete your own changes')
    }
    const meta = this.em.getMetadata().get(model)
    if (!meta.name) {
      throw NotFoundErr(`Entity "${model}" not found in metadata`)
    }
    // First check if it exists in the change
    const edit = change.edits.find((e) => {
      if (e.entityName === meta.name && e.entityID === input.id) {
        return true
      }
      return false
    })
    const conflictingEdit = this.findConflictingReferenceEdit(change, meta.name, input.id, edit)
    if (conflictingEdit) {
      throw BadRequestErr(
        `Cannot delete ${meta.name} with ID "${input.id}" because pending edit "${conflictingEdit.entityName}" with ID "${conflictingEdit.entityID}" references it`,
      )
    }
    if (edit) {
      if (!edit.original) {
        // The edit is currently a create, so discard the edit entirely
        change.edits.remove(edit)
      } else if (edit.changes) {
        edit.changes = undefined // Turn the edit into a delete
      }
      await this.persistChange(change)
      return { id: input.id }
    }
    // If not, check if it exists in the database
    const options = { disableIdentityMap: isUsingChange(input) }
    const entity = await this.em.findOne<T>(model, { id: input.id } as FilterQuery<T>, options)
    if (!entity) {
      throw NotFoundErr(`${meta.name} with ID "${input.id}" not found`)
    }
    const newEdit = new ChangeEdits()
    newEdit.entityName = meta.name
    newEdit.entityID = input.id
    newEdit.userID = userID
    newEdit.original = this.entityToChangePOJO(meta.name, entity as BaseEntity & { id: string })
    change.edits.add(newEdit)
    await this.persistChange(change)
    return { id: input.id }
  }

  /**
   * Ensures a change edit exists for an entity before mutating staged values.
   *
   * If no edit exists, this captures the current entity snapshot into `original`. If an edit already
   * exists, it is reused and subsequent update steps can overwrite `changes`.
   *
   * Use this at the start of update flows in change mode.
   */
  async beginUpdateEntityEdit(change: Change, entity: BaseEntity & { id: string }) {
    if (!this.authUser.sameUserOrAdmin(change.user.id)) {
      throw BadRequestErr('You can only update edits for your own changes')
    }
    let edit = change.edits.find(
      (e) => e.entityName === entity.constructor.name && e.entityID === entity.id,
    )
    if (!edit) {
      edit = new ChangeEdits()
      edit.entityName = entity.constructor.name
      edit.entityID = entity.id
      edit.userID = this.authUser.userID()!
      edit.original = this.entityToChangePOJO(entity.constructor.name, entity)
      change.edits.add(edit)
    }
  }

  /**
   * Writes the latest staged entity state into an existing change edit.
   *
   * This serializes the entity with `entityToChangePOJO` and stores it in `edit.changes`, preserving
   * the `original` snapshot created earlier by `beginUpdateEntityEdit`.
   *
   * Use after service field mutation logic has finished in change mode.
   */
  async updateEntityEdit(change: Change, entity: BaseEntity & { id: string }) {
    const edit = change.edits.find(
      (e) => e.entityName === entity.constructor.name && e.entityID === entity.id,
    )
    if (!edit) {
      throw NotFoundErr(
        `Edit for entity "${entity.constructor.name}" with ID "${entity.id}" not found`,
      )
    }
    const fullPojo = this.entityToChangePOJO(entity.constructor.name, entity)
    edit.changes = this.diffChangePOJO(edit.original as Record<string, any> | undefined, fullPojo)
  }

  /**
   * Creates a new create-edit entry for an entity inside a change.
   *
   * The entity is serialized into `changes` and does not set `original`, which marks the edit as a
   * create operation for merge.
   *
   * Use this when creating new entities in change mode.
   */
  async createEntityEdit(change: Change, entity: BaseEntity & { id: string }) {
    if (!this.authUser.sameUserOrAdmin(change.user.id)) {
      throw BadRequestErr('You can only create edits for your own changes')
    }
    const entityName = entity.constructor.name
    if (!entityName) {
      throw BadRequestErr('Entity name is required for edit creation')
    }
    const edit = new ChangeEdits()
    edit.entityName = entityName
    edit.entityID = entity.id
    edit.userID = this.authUser.userID()!
    edit.changes = this.entityToChangePOJO(entityName, entity)
    change.edits.add(edit)
  }

  /**
   * Schedules creation of an entity edit payload onto the active unit of work.
   *
   * Scalar fields and to-one references are created on the root entity, while pivot/tree rows are
   * materialized separately from array relation payloads. This keeps creation compatible with pivot
   * entities that have composite keys or additional relation fields.
   *
   * Use only from merge when replaying create edits.
   */
  private applyEntityCreate(entityName: string, pojo: Record<string, any>): void {
    const meta = this.em.getMetadata().get(entityName)
    const { flattenArrayRefs, flattenToId } = this.categorizePOJORelations(meta)
    const pivotFieldNames = new Set(flattenArrayRefs.map((r) => r.name))
    const scalarData: Record<string, any> = {}
    for (const [key, val] of Object.entries(pojo)) {
      if (pivotFieldNames.has(key)) continue
      scalarData[key] = flattenToId.includes(key) ? this.toRelationReference(meta, key, val) : val
    }
    this.em.create(meta.class, scalarData as any, { persist: true })
    for (const { name, targetMeta } of flattenArrayRefs) {
      if (!(name in pojo)) continue
      const items: any[] = Array.isArray(pojo[name]) ? pojo[name] : []
      for (const itemData of items) {
        const restored = this.unflattenNestedRefs(itemData, targetMeta)
        this.em.create(targetMeta.class, restored, { persist: true })
      }
    }
  }

  /**
   * Applies an update edit payload to an existing persisted entity.
   *
   * For pivot/tree collections, it computes row-level diffs by primary key signature to remove stale
   * rows, update existing rows, and insert missing rows. Scalar and to-one fields are then assigned on
   * the parent entity.
   *
   * Use only from merge when replaying update edits.
   */
  private async applyEntityUpdate(
    entityName: string,
    entityID: string,
    pojo: Record<string, any>,
  ): Promise<BaseEntity> {
    const meta = this.em.getMetadata().get(entityName)
    const { flattenArrayRefs, flattenToId } = this.categorizePOJORelations(meta)
    const populateFields = flattenArrayRefs.map((r) => r.name)
    const entity = populateFields.length
      ? await this.em.findOne(
          entityName,
          { id: entityID } as any,
          {
            populate: populateFields,
          } as any,
        )
      : await this.em.findOne(entityName, { id: entityID } as any)
    if (!entity) {
      throw NotFoundErr(`${entityName} with ID "${entityID}" not found`)
    }

    for (const { name, targetMeta } of flattenArrayRefs) {
      if (!(name in pojo)) continue
      const collection = (entity as any)[name] as Collection<any>
      if (!collection.isInitialized()) {
        await collection.init({ ref: true })
      }
      const existing = collection.getItems()
      const existingByKey = new Map<string, any>()
      for (const item of existing) {
        existingByKey.set(
          this.getPrimaryKeySignature(item as Record<string, any>, targetMeta),
          item,
        )
      }

      const newItems: any[] = Array.isArray(pojo[name]) ? pojo[name] : []
      const incomingByKey = new Map<string, Record<string, any>>()
      for (const itemData of newItems) {
        const restored = this.unflattenNestedRefs(itemData, targetMeta)
        incomingByKey.set(this.getPrimaryKeySignature(restored, targetMeta), restored)
      }

      for (const [key, existingItem] of existingByKey.entries()) {
        const incomingItem = incomingByKey.get(key)
        if (!incomingItem) {
          this.em.remove(existingItem)
          continue
        }
        this.em.assign(existingItem, incomingItem as any)
        incomingByKey.delete(key)
      }

      for (const incomingItem of incomingByKey.values()) {
        const pivotEntity = this.em.create(targetMeta.class, incomingItem)
        this.em.persist(pivotEntity)
      }
    }

    const pivotFieldNames = new Set(flattenArrayRefs.map((r) => r.name))
    const scalarData: Record<string, any> = {}
    for (const [key, val] of Object.entries(pojo)) {
      if (pivotFieldNames.has(key)) continue
      scalarData[key] = flattenToId.includes(key) ? this.toRelationReference(meta, key, val) : val
    }
    this.em.assign(entity as any, scalarData)
    return entity as BaseEntity
  }

  /**
   * Applies a delete edit by removing pivot/tree dependents before deleting the parent entity.
   *
   * This ensures dependent rows represented as explicit 1:m pivot/tree collections are scheduled for
   * deletion in the same unit of work, avoiding FK ordering issues during flush.
   *
   * Use only from merge when replaying delete edits.
   */
  private async applyEntityDelete(entityName: string, entityID: string): Promise<BaseEntity> {
    const meta = this.em.getMetadata().get(entityName)
    const { flattenArrayRefs } = this.categorizePOJORelations(meta)
    const populateFields = flattenArrayRefs.map((r) => r.name)
    const entity = populateFields.length
      ? await this.em.findOne(
          entityName,
          { id: entityID } as any,
          {
            populate: populateFields,
          } as any,
        )
      : await this.em.findOne(entityName, { id: entityID } as any)
    if (!entity) {
      throw NotFoundErr(`${entityName} with ID "${entityID}" not found`)
    }

    for (const { name } of flattenArrayRefs) {
      const collection = (entity as any)[name] as Collection<any>
      if (!collection.isInitialized()) {
        await collection.init({ ref: true })
      }
      const existing = collection.getItems()
      for (const item of existing) {
        collection.removeWithoutPropagation(item)
        this.em.remove(item)
      }
    }

    this.em.remove(entity)
    return entity as BaseEntity
  }

  /**
   * Triggers merge immediately when the caller requested apply-on-approve semantics.
   *
   * Use this after persisting change edits in mutation handlers that accept `MergeInput`.
   */
  async checkMerge(change: Change, mergeInput: MergeInput) {
    if (change.status === ChangeStatus.APPROVED && mergeInput.apply) {
      await this.merge(change)
    }
  }

  /**
   * Validates merge preconditions and merges a change by ID.
   *
   * Use this from resolver endpoints that trigger merge directly by change identifier.
   */
  async mergeID(changeID: string, dryRun = false) {
    const change = await this.em.findOne(Change, { id: changeID }, { populate: ['edits', 'user'] })
    if (!change) {
      throw NotFoundErr(`Change with ID "${changeID}" not found`)
    }
    if (!this.authUser.sameUserOrAdmin(change.user.id)) {
      throw BadRequestErr('You can only merge your own changes')
    }
    if (change.status !== ChangeStatus.APPROVED) {
      throw BadRequestErr(`Change with ID "${changeID}" is not approved and cannot be merged`)
    }
    return this.merge(change, dryRun)
  }

  /**
   * Replays all edits in an approved change into persistent storage in one transactional workflow.
   *
   * The method orders create edits by detected dependencies, applies create/update/delete operations,
   * flushes once, records history entries for create/update edits, and commits the transaction. On any
   * failure, it rolls back transactional work and marks the change as rejected.
   *
   * Use this as the canonical merge execution path.
   */
  async merge(change: Change, dryRun = false) {
    await this.em.begin()
    try {
      const historyItems: Array<{
        name: string
        userID: string
        original: EntityDTO<BaseEntity> | undefined
        changes: EntityDTO<BaseEntity> | undefined
      }> = []

      const createEdits = change.edits.filter((e) => !!e.entityID && !e.original && !!e.changes)
      const otherEdits = change.edits.filter((e) => !!e.entityID && (!!e.original || !e.changes))

      const createByID = new Map(createEdits.map((edit) => [edit.entityID!, edit]))
      const createIDs = new Set(createByID.keys())
      const orderedCreates: ChangeEdits[] = []
      const visitedCreates = new Set<string>()
      const visitingCreates = new Set<string>()

      const visitCreate = (edit: ChangeEdits) => {
        const id = edit.entityID!
        if (visitedCreates.has(id)) return
        if (visitingCreates.has(id)) return
        visitingCreates.add(id)
        const deps = this.getCreateDependencies(
          edit.entityName,
          edit.changes as Record<string, any>,
          createIDs,
          id,
        )
        for (const depID of deps) {
          const depEdit = createByID.get(depID)
          if (depEdit) {
            visitCreate(depEdit)
          }
        }
        visitingCreates.delete(id)
        visitedCreates.add(id)
        orderedCreates.push(edit)
      }

      for (const edit of createEdits) {
        visitCreate(edit)
      }

      for (const edit of orderedCreates) {
        this.applyEntityCreate(edit.entityName, edit.changes as Record<string, any>)
        historyItems.push({
          name: edit.entityName,
          userID: change.user.id,
          original: edit.original,
          changes: edit.changes,
        })
      }

      const conflicts: MergeConflict[] = []

      for (const edit of otherEdits) {
        const editMeta = this.em.getMetadata().get(edit.entityName)
        const { flattenArrayRefs } = this.categorizePOJORelations(editMeta)
        const conflictPopulate = flattenArrayRefs.map((r) => r.name)
        const currentEntity = await this.em.findOne(
          edit.entityName,
          { id: edit.entityID! } as any,
          conflictPopulate.length ? ({ populate: conflictPopulate } as any) : undefined,
        )
        if (!currentEntity) {
          throw NotFoundErr(`${edit.entityName} with ID "${edit.entityID}" not found`)
        }
        const currentPOJO = this.entityToChangePOJO(
          edit.entityName,
          currentEntity as BaseEntity & { id: string },
        )

        if (edit.original && edit.changes) {
          const conflict = this.findEditConflict(edit, currentPOJO)
          if (conflict) {
            conflicts.push({
              entityName: edit.entityName,
              entityID: edit.entityID!,
              message: conflict,
            })
            continue
          }
        }

        if (edit.original && !edit.changes) {
          await this.applyEntityDelete(edit.entityName, edit.entityID!)
        } else if (edit.original && edit.changes) {
          await this.applyEntityUpdate(
            edit.entityName,
            edit.entityID!,
            edit.changes as Record<string, any>,
          )
        } else {
          throw BadRequestErr(`Edit for entity "${edit.entityName}" is invalid`)
        }
        if (edit.changes) {
          historyItems.push({
            name: edit.entityName,
            userID: change.user.id,
            original: currentPOJO,
            changes: edit.original
              ? { ...currentPOJO, ...(edit.changes as Record<string, any>) }
              : edit.changes,
          })
        }
      }

      if (conflicts.length > 0) {
        if (dryRun) {
          await this.em.rollback()
          return { change, success: false, conflicts }
        }
        const message = conflicts
          .map((c) => `${c.entityName} "${c.entityID}": ${c.message}`)
          .join('; ')
        throw BadRequestErr(`Cannot merge change: ${message}`)
      }

      if (dryRun) {
        await this.em.rollback()
        return { change, success: true, conflicts: [] }
      }

      await this.em.flush()

      for (const { name, userID, original, changes } of historyItems) {
        await this.createHistory<BaseEntity>(name, userID, original, changes)
      }

      change.status = ChangeStatus.MERGED
      await this.em.commit()
      return { change, success: true, conflicts: [] }
    } catch (error) {
      await this.em.rollback()
      if (!dryRun) {
        change.status = ChangeStatus.REJECTED
        await this.em.persist(change).flush()
      }
      throw error
    }
  }

  /**
   * Appends a history record for an entity operation when a corresponding history model exists.
   *
   * The method skips no-op updates, validates that an entity ID is present in `original/changes`, and
   * creates a row keyed to the target entity and current user.
   *
   * Use from service update/create paths and from merge after replaying non-delete edits.
   */
  async createHistory<T>(
    name: EntityName<T>,
    userID: string,
    original: EntityDTO<T> | undefined,
    changes: EntityDTO<T> | undefined,
  ) {
    const historyMeta = this.em.getMetadata().get(name + 'History')
    if (!historyMeta) {
      return
    }
    if (original && changes && _.isEqual(original, changes)) {
      return
    }
    const id =
      (changes && typeof changes === 'object' ? (changes as any).id : undefined) ||
      (original && typeof original === 'object' ? (original as any).id : undefined)
    if (!id) {
      throw BadRequestErr(`Cannot create history for "${String(name)}" without entity ID`)
    }
    const pk0 = historyMeta.primaryKeys[0]
    const parentEntityClass = historyMeta.properties[pk0].type
    this.em.create(historyMeta.className, {
      [pk0]: ref(this.em.getMetadata().get(parentEntityClass).class, id),
      datetime: new Date(),
      user: ref(User, userID),
      original,
      changes,
    })
  }

  /**
   * Computes the minimal set of fields that changed between a before/after change POJO snapshot.
   *
   * `id` is always included since downstream consumers (changePOJOToEntity, applyEntityUpdate,
   * History resolvers) key off `pojo.id`.
   *
   * Use this to store `edit.changes` as a diff against `edit.original` rather than a full snapshot.
   */
  private diffChangePOJO(
    before: Record<string, any> | undefined,
    after: Record<string, any>,
  ): Record<string, any> {
    const diff: Record<string, any> = { id: after.id }
    for (const [key, val] of Object.entries(after)) {
      if (key === 'id') continue
      if (!before || !_.isEqual(before[key], val)) {
        diff[key] = val
      }
    }
    return diff
  }

  /**
   * Reconstructs the full proposed entity state for an edit by overlaying its diff `changes` onto its
   * full `original` snapshot.
   *
   * Use this wherever downstream code needs the complete proposed entity rather than the raw stored
   * diff (e.g. building input models, delete-reference conflict checks).
   */
  effectiveChanges(edit: ChangeEdits): Record<string, any> | undefined {
    if (!edit.changes) return undefined
    return edit.original
      ? { ...(edit.original as Record<string, any>), ...(edit.changes as Record<string, any>) }
      : (edit.changes as Record<string, any>)
  }

  /**
   * Detects whether a field this update edit touches has drifted in the database since `edit.original`
   * was captured, by comparing `currentPOJO` (a fresh serialization of the live entity) against
   * `edit.original` restricted to the keys present in `edit.changes`.
   *
   * Use this from both merge (to reject a stale merge) and the `edits` GraphQL resolver (to surface
   * `conflict`/`conflictDesc`) so both agree on the same definition of "conflict."
   */
  findEditConflict(edit: ChangeEdits, currentPOJO: Record<string, any>): string | undefined {
    if (!edit.original || !edit.changes) return undefined
    const original = edit.original as Record<string, any>
    const changedKeys = Object.keys(edit.changes as Record<string, any>).filter((k) => k !== 'id')
    for (const key of changedKeys) {
      if (!_.isEqual(currentPOJO[key], original[key])) {
        return `field "${key}" was changed to a different value since this edit was created`
      }
    }
    return undefined
  }

  entityToChangePOJO(
    entityName: EntityName<any>,
    entity: BaseEntity & { id: string },
  ): EntityDTO<BaseEntity> {
    const meta = this.em.getMetadata().get(entityName)
    if (!meta) {
      throw NotFoundErr(`Entity "${entityName}" not found in metadata`)
    }
    const { flattenArrayRefs, flattenToId, changeOmit } = this.categorizePOJORelations(meta)

    const pojo: any = _.cloneDeep(entity.toPOJO())

    flattenToId.forEach((name) => {
      if (pojo[name] && _.isObject(pojo[name]) && _.has(pojo[name], 'id')) {
        pojo[name] = (pojo[name] as any).id
      }
    })

    flattenArrayRefs.forEach(({ name }) => {
      if (!pojo[name]) return
      if (Array.isArray(pojo[name])) {
        pojo[name] = pojo[name].map((item: any) => (item ? this.flattenNestedRefs(item) : item))
      } else if (_.isObject(pojo[name])) {
        pojo[name] = this.flattenNestedRefs(pojo[name] as Record<string, any>)
      }
    })

    return _.omit(pojo, [...changeOmit, 'createdAt', 'updatedAt'])
  }

  /**
   * Classifies entity relations for POJO serialization/deserialization and merge application.
   *
   * - `flattenToId`: to-one relations stored as IDs in change payloads.
   * - `flattenArrayRefs`: 1:m pivot/tree collections preserved as row arrays in change payloads.
   * - `changeOmit`: relation fields excluded from persisted change payloads.
   *
   * Use this helper anywhere relation-aware transformation of change POJOs is needed.
   */
  private categorizePOJORelations(meta: EntityMetadata): {
    flattenArrayRefs: Array<{ name: string; targetMeta: EntityMetadata }>
    flattenToId: string[]
    changeOmit: string[]
  } {
    const pivotEntityNames = new Set<string>()
    meta.relations.forEach((rel) => {
      if (rel.kind === 'm:n' && rel.pivotEntity && !rel.mappedBy) {
        pivotEntityNames.add(rel.pivotEntity as string)
      }
    })

    const flattenArrayRefs: Array<{ name: string; targetMeta: EntityMetadata }> = []
    const flattenToId: string[] = []
    const changeOmit: string[] = []

    meta.relations.forEach((rel) => {
      if (rel.name.startsWith('history')) {
        changeOmit.push(rel.name)
        return
      }
      switch (rel.kind) {
        case 'm:n':
          changeOmit.push(rel.name)
          break
        case '1:m': {
          const targetName = rel.targetMeta?.className
          const isPivot = !!targetName && pivotEntityNames.has(targetName)
          const isTree = !!rel.targetMeta && this.isTreeEntity(rel.targetMeta)
          if ((isPivot || isTree) && rel.targetMeta) {
            flattenArrayRefs.push({ name: rel.name, targetMeta: rel.targetMeta })
          } else {
            changeOmit.push(rel.name)
          }
          break
        }
        case 'm:1':
          if (rel.primary) {
            changeOmit.push(rel.name)
          } else {
            flattenToId.push(rel.name)
          }
          break
        case '1:1':
          flattenToId.push(rel.name)
          break
      }
    })

    meta.props?.forEach((prop) => {
      if (isExcludedFromDiff(meta.prototype, prop.name)) {
        changeOmit.push(prop.name)
      }
    })

    return {
      flattenArrayRefs,
      flattenToId,
      changeOmit,
    }
  }

  /** Returns true if every primary M:1 on this entity points to the same entity type
   *  (closure table / edge table pattern: CategoryTree, CategoryEdge, etc.) */
  private isTreeEntity(meta: EntityMetadata): boolean {
    const primaryM1s = meta.relations.filter((r) => r.kind === 'm:1' && r.primary)
    if (primaryM1s.length < 2) return false
    const targets = new Set(primaryM1s.map((r) => r.targetMeta?.className))
    return targets.size === 1
  }

  /** Shallow-clones an object, replacing any value of the form {id: '...'} with just the ID string.
   *  Handles M:1 refs inside pivot/tree entity rows (e.g. VariantsOrgs.region). */
  private flattenNestedRefs(item: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {}
    for (const [key, val] of Object.entries(item)) {
      result[key] =
        val && _.isObject(val) && !Array.isArray(val) && _.has(val, 'id') ? (val as any).id : val
    }
    return result
  }

  /** Reverse of flattenNestedRefs: shallow-clones an object, converting any string value back to
   *  {id: value} when the field name corresponds to a relation in the target entity's metadata. */
  private unflattenNestedRefs(
    item: Record<string, any>,
    targetMeta: EntityMetadata,
  ): Record<string, any> {
    const relFields = new Set(targetMeta.relations.map((r) => r.name))
    const result: Record<string, any> = {}
    for (const [key, val] of Object.entries(item)) {
      result[key] =
        typeof val === 'string' && relFields.has(key)
          ? this.toRelationReference(targetMeta, key, val)
          : val
    }
    return result
  }

  /**
   * Builds a stable composite-key signature for pivot/tree rows.
   *
   * Use this when diffing existing and incoming pivot rows during merge updates.
   */
  private getPrimaryKeySignature(item: Record<string, any>, targetMeta: EntityMetadata): string {
    return targetMeta.primaryKeys
      .map((key) => {
        const val = item[key]
        if (val && _.isObject(val) && !Array.isArray(val) && _.has(val, 'id')) {
          return String((val as any).id)
        }
        return String(val)
      })
      .join('::')
  }

  /**
   * Converts a string ID into an ORM relation reference for a specific relation field.
   *
   * Use during POJO restoration whenever a flattened relation value needs to become assignable
   * relation data again.
   */
  private toRelationReference(meta: EntityMetadata, fieldName: string, value: unknown): unknown {
    if (typeof value !== 'string') {
      return value
    }
    const relation = meta.relations.find((rel) => rel.name === fieldName)
    if (!relation?.targetMeta) {
      return { id: value }
    }
    return this.em.getReference(relation.targetMeta.class, value as any)
  }

  /**
   * Returns whether an edit currently represents a pending delete operation.
   *
   * Use as a guard before allowing new references to, or updates of, staged entities.
   */
  private isPendingDeleteEdit(edit: ChangeEdits): boolean {
    return !!edit.original && !edit.changes
  }

  /**
   * Finds any staged edit in a change that references a target entity.
   *
   * Use before scheduling deletes to enforce referential safety within the change boundary.
   */
  private findConflictingReferenceEdit(
    change: Change,
    targetEntityName: string,
    targetID: string,
    ignoreEdit?: ChangeEdits,
  ): ChangeEdits | undefined {
    return change.edits.find((edit) => {
      if (ignoreEdit && edit === ignoreEdit) return false
      return this.editReferencesEntity(edit, targetEntityName, targetID)
    })
  }

  /**
   * Checks whether a single edit payload references a specific target entity ID.
   *
   * The check covers both flattened to-one relation fields and nested pivot/tree row relation fields.
   * Use as the primitive matcher for delete-conflict detection.
   */
  private editReferencesEntity(
    edit: ChangeEdits,
    targetEntityName: string,
    targetID: string,
  ): boolean {
    if (!edit.changes) return false
    const meta = this.em.getMetadata().get(edit.entityName)
    const changes = this.effectiveChanges(edit) as Record<string, any>
    const { flattenArrayRefs, flattenToId } = this.categorizePOJORelations(meta)

    for (const field of flattenToId) {
      const relation = meta.relations.find((rel) => rel.name === field)
      if (!relation?.targetMeta || relation.targetMeta.name !== targetEntityName) {
        continue
      }
      const val = changes[field]
      const refID =
        typeof val === 'string'
          ? val
          : val && _.isObject(val) && _.has(val, 'id')
            ? String((val as any).id)
            : undefined
      if (refID === targetID) {
        return true
      }
    }

    for (const { name, targetMeta } of flattenArrayRefs) {
      const rows = Array.isArray(changes[name])
        ? changes[name]
        : changes[name]
          ? [changes[name]]
          : []
      const relFields = targetMeta.relations.filter(
        (rel) => rel.kind === 'm:1' || rel.kind === '1:1',
      )
      for (const row of rows) {
        if (!row || !_.isObject(row)) continue
        for (const rel of relFields) {
          if (!rel.targetMeta || rel.targetMeta.name !== targetEntityName) {
            continue
          }
          const val = (row as any)[rel.name]
          const refID =
            typeof val === 'string'
              ? val
              : val && _.isObject(val) && _.has(val, 'id')
                ? String((val as any).id)
                : undefined
          if (refID === targetID) {
            return true
          }
        }
      }
    }

    return false
  }

  /**
   * Extracts create-edit dependencies from relation values in a change payload.
   *
   * A dependency exists when a relation points to another entity ID that is also being created in the
   * same change. Use this output to order create edits before merge flush.
   */
  private getCreateDependencies(
    entityName: string,
    pojo: Record<string, any>,
    createIDs: Set<string>,
    selfID?: string,
  ): string[] {
    const meta = this.em.getMetadata().get(entityName)
    const { flattenArrayRefs, flattenToId } = this.categorizePOJORelations(meta)
    const deps = new Set<string>()

    for (const field of flattenToId) {
      const val = pojo[field]
      if (typeof val === 'string' && createIDs.has(val)) {
        deps.add(val)
      }
    }

    for (const { name, targetMeta } of flattenArrayRefs) {
      const rows = Array.isArray(pojo[name]) ? pojo[name] : pojo[name] ? [pojo[name]] : []
      const relationFields = targetMeta.relations
        .filter((rel) => rel.kind === 'm:1' || rel.kind === '1:1')
        .map((rel) => rel.name)
      for (const row of rows) {
        if (!row || !_.isObject(row)) continue
        for (const relName of relationFields) {
          const relVal = (row as any)[relName]
          if (typeof relVal === 'string' && createIDs.has(relVal)) {
            deps.add(relVal)
          }
        }
      }
    }

    if (selfID) {
      deps.delete(selfID)
    }
    return [...deps]
  }

  /**
   * Reverse of entityToChangePOJO: takes a stored POJO from a ChangeEdit, restores the
   * flattened relation fields to {id: string} ref objects, and returns the initialized entity.
   *
   * The returned entity is suitable for passing directly to ZService.entityToModel.
   */
  async changePOJOToEntity(
    entityName: EntityName<any>,
    pojo: Record<string, any>,
  ): Promise<BaseEntity> {
    const meta = this.em.getMetadata().get(entityName)
    if (!meta) {
      throw NotFoundErr(`Entity "${entityName}" not found in metadata`)
    }
    const { flattenArrayRefs, flattenToId } = this.categorizePOJORelations(meta)

    // Build restored POJO from the plain JSON (avoid cloneDeep on MikroORM entities)
    const restored: Record<string, any> = { ...pojo }

    // Restore m:1/1:1 string IDs → {id: string}
    flattenToId.forEach((name) => {
      if (typeof restored[name] === 'string') {
        restored[name] = { id: restored[name] }
      }
    })

    // Restore 1:M array items: string relation values → {id: string}
    flattenArrayRefs.forEach(({ name, targetMeta }) => {
      if (!restored[name]) return
      if (Array.isArray(restored[name])) {
        restored[name] = restored[name].map((item: any) =>
          item ? this.unflattenNestedRefs(item, targetMeta) : item,
        )
      } else if (_.isObject(restored[name])) {
        restored[name] = this.unflattenNestedRefs(restored[name] as Record<string, any>, targetMeta)
      }
    })

    // Fetch entity from DB so we get a properly typed, initialized entity
    const strEntityName = typeof entityName === 'string' ? entityName : entityName.name
    const entityServiceResult = this.metaService.findEntityService(strEntityName)
    if (!entityServiceResult) {
      throw NotFoundErr(`No entity service found for "${entityName}"`)
    }
    const [, entityService] = entityServiceResult
    const id = typeof pojo.id === 'string' ? pojo.id : undefined
    const dbEntity = id ? await entityService.findOneByID(id) : null

    if (dbEntity) {
      // Create a disconnected entity from the POJO to avoid modifying the current identity map
      const forked = this.em.fork()
      const createdEntity = forked.create(entityName, restored)
      const assignedEntity = wrap(createdEntity).assign(restored, { em: forked }) as BaseEntity
      forked.clear()
      return assignedEntity
    }

    const pivotFieldNames = new Set(flattenArrayRefs.map((r) => r.name))
    const scalarData: Record<string, any> = {}
    for (const [key, val] of Object.entries(restored)) {
      if (pivotFieldNames.has(key)) continue
      scalarData[key] = val
    }

    // Entity not yet persisted (draft create) — create an in-memory instance from the POJO,
    // then hydrate pivot/tree collections with detached child rows as well.
    const entity = this.em.create(meta.class, scalarData, { persist: false, managed: false })
    for (const { name, targetMeta } of flattenArrayRefs) {
      if (!(name in restored)) continue
      const items = Array.isArray(restored[name])
        ? restored[name]
        : restored[name]
          ? [restored[name]]
          : []
      const collection = (entity as any)[name] as Collection<any>
      const detachedItems = items.map((item) =>
        this.em.create(targetMeta.class, item, { persist: false, managed: false }),
      )
      collection.set(detachedItems)
    }
    return entity
  }

  /**
   * Computes every *other* entity a single edit adds, removes, or modifies a reference to — the
   * edited entity itself is never included, so an edit that changes no relation fields returns an
   * empty list. Not deduplicated: a target referenced by more than one field appears once per
   * field/event.
   *
   * Use this to power `Edit.refNodes`, so clients can render a diff-style summary of an edit's blast
   * radius without resolving each relation field individually.
   */
  computeRefNodes(edit: ChangeEdits): RefNode[] {
    const refNodes: RefNode[] = []

    if (!edit.changes) {
      return refNodes
    }

    const meta = this.em.getMetadata().get(edit.entityName)
    const { flattenToId, flattenArrayRefs } = this.categorizePOJORelations(meta)
    const changedKeys = Object.keys(edit.changes as Record<string, any>)
    const changes = this.effectiveChanges(edit) as Record<string, any>
    const original = (edit.original ?? {}) as Record<string, any>

    const extractRefID = (val: any): string | undefined =>
      typeof val === 'string'
        ? val
        : val && _.isObject(val) && _.has(val, 'id')
          ? String((val as any).id)
          : undefined

    for (const field of flattenToId) {
      if (!changedKeys.includes(field)) continue
      const relation = meta.relations.find((rel) => rel.name === field)
      if (!relation?.targetMeta?.name) continue
      const targetName = relation.targetMeta.name
      const oldID = extractRefID(original[field])
      const newID = extractRefID(changes[field])
      if (oldID && oldID !== newID) {
        refNodes.push({ id: toGlobalId(targetName, oldID), op: OpType.REMOVED, field })
      }
      if (newID && newID !== oldID) {
        refNodes.push({ id: toGlobalId(targetName, newID), op: OpType.ADDED, field })
      }
    }

    for (const { name, targetMeta } of flattenArrayRefs) {
      if (!changedKeys.includes(name)) continue
      const beforeRows: any[] = Array.isArray(original[name]) ? original[name] : []
      const afterRows: any[] = Array.isArray(changes[name]) ? changes[name] : []

      const beforeByKey = new Map<string, Record<string, any>>()
      for (const row of beforeRows) {
        if (row && _.isObject(row)) {
          beforeByKey.set(this.getPrimaryKeySignature(row, targetMeta), row)
        }
      }
      const afterByKey = new Map<string, Record<string, any>>()
      for (const row of afterRows) {
        if (row && _.isObject(row)) {
          afterByKey.set(this.getPrimaryKeySignature(row, targetMeta), row)
        }
      }

      const relFields = targetMeta.relations.filter(
        (rel) => rel.kind === 'm:1' || rel.kind === '1:1',
      )
      const resolveRowRef = (
        row: Record<string, any>,
      ): { type: string; id: string } | undefined => {
        for (const rel of relFields) {
          if (!rel.targetMeta?.name) continue
          const refID = extractRefID(row[rel.name])
          // Skip the field that points back to the entity being edited (e.g. `item` on an
          // ItemsCategories row) so the resolved ref is the *other*, foreign side of the row.
          if (refID && refID !== edit.entityID) {
            return { type: rel.targetMeta.name, id: refID }
          }
        }
        return undefined
      }

      const allKeys = new Set([...beforeByKey.keys(), ...afterByKey.keys()])
      for (const key of allKeys) {
        const beforeRow = beforeByKey.get(key)
        const afterRow = afterByKey.get(key)
        let op: OpType
        let row: Record<string, any>
        if (!beforeRow && afterRow) {
          op = OpType.ADDED
          row = afterRow
        } else if (beforeRow && !afterRow) {
          op = OpType.REMOVED
          row = beforeRow
        } else if (beforeRow && afterRow && !_.isEqual(beforeRow, afterRow)) {
          op = OpType.MODIFIED
          row = afterRow
        } else {
          continue
        }
        const ref = resolveRowRef(row)
        if (!ref) continue
        refNodes.push({ id: toGlobalId(ref.type, ref.id), op, field: name })
      }
    }

    return refNodes
  }
}
