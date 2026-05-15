import { BaseEntity, Collection, EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { type IChangeInputWithLang } from '@src/changes/change-ext.model'
import { Change as ChangeEntity } from '@src/changes/change.entity'
import { EditModelType, RefModelType } from '@src/changes/change.enum'
import { AddRefOutput, Change as ChangeModel, RemoveRefOutput } from '@src/changes/change.model'
import { EditService } from '@src/changes/edit.service'
import { AddRefInput, RemoveRefInput } from '@src/changes/ref-edit.model'
import { type RefEditDefinition, resolveRefEditDefinition } from '@src/changes/ref-edit.registry'
import { BadRequestErr } from '@src/common/exceptions'
import { TransformService } from '@src/common/transform'
import { TagService } from '@src/process/tag.service'

type EditEntity = BaseEntity & { id: string }
type PivotRow = { id: string } & Record<string, unknown>

@Injectable()
export class RefEditService {
  constructor(
    private readonly em: EntityManager,
    private readonly editService: EditService,
    private readonly transform: TransformService,
    private readonly tagService: TagService,
  ) {}

  async addRef(
    model: EditModelType,
    id: string,
    input: AddRefInput,
    userID?: string,
  ): Promise<AddRefOutput> {
    const definition = this.resolveDefinition(model, input.refModel, input.refField)
    const addItems = this.normalizeAddItems(input)
    await this.validateAddItems(definition, addItems)

    if (definition.owningRef) {
      return this.addRefViaOwning(definition, id, input, userID, addItems)
    }

    return this.executeMutation(definition, id, input, userID, async (entity, change) => {
      const collection = this.getRelationCollection(entity, definition.relationCollection)

      if (definition.relationKind === 'pivot') {
        await this.editService.setOrAddPivot(
          entity.id,
          change,
          collection,
          definition.entity,
          definition.pivotEntity!,
          undefined,
          addItems,
        )
        return
      }

      await this.editService.setOrAddCollection(
        collection,
        definition.targetEntity,
        undefined,
        addItems.map((item) => ({ id: item.id })),
        change,
      )
    })
  }

  private async validateAddItems(
    definition: RefEditDefinition,
    addItems: PivotRow[],
  ): Promise<void> {
    if (definition.refModel !== RefModelType.Tag) {
      return
    }

    for (const item of addItems) {
      const validated = await this.tagService.validateTagInput(item)
      if (validated.meta !== undefined) {
        item.meta = validated.meta
      }
    }
  }

  async removeRef(
    model: EditModelType,
    id: string,
    input: RemoveRefInput,
    userID?: string,
  ): Promise<RemoveRefOutput> {
    const definition = this.resolveDefinition(model, input.refModel, input.refField)
    const removeIDs = input.ref ? [input.ref] : (input.refs ?? [])

    if (definition.owningRef) {
      return this.removeRefViaOwning(definition, id, input, userID, removeIDs)
    }

    return this.executeMutation(definition, id, input, userID, async (entity, change) => {
      const collection = this.getRelationCollection(entity, definition.relationCollection)

      if (definition.relationKind === 'pivot') {
        await this.editService.removeFromPivot(
          change,
          collection,
          definition.entity,
          definition.pivotEntity!,
          removeIDs,
        )
        return
      }

      await this.editService.removeFromCollection(
        collection,
        definition.targetEntity,
        removeIDs,
        change,
      )
    })
  }

  private resolveDefinition(
    model: EditModelType,
    refModel: RefModelType,
    refField?: string,
  ): RefEditDefinition {
    return resolveRefEditDefinition(model, refModel, refField)
  }

  /**
   * Handles addRef for inverse-side M:N relations by delegating to the owning-side entity.
   *
   * For each target ID (e.g., Variant), loads the owning entity, creates/updates its Change Edit,
   * and adds the root entity (e.g., Item) to the owning entity's pivot collection. This ensures
   * Change Edits are created on the owning side where the pivot rows actually live.
   */
  private async addRefViaOwning(
    definition: RefEditDefinition,
    rootId: string,
    input: AddRefInput,
    userID: string | undefined,
    addItems: PivotRow[],
  ): Promise<AddRefOutput> {
    const owningDef = this.resolveDefinition(
      definition.owningRef!.model,
      definition.owningRef!.refModel,
      definition.owningRef!.refField,
    )

    let lastChange: ChangeModel | undefined

    for (const addItem of addItems) {
      const result = await this.executeMutation(
        owningDef,
        addItem.id,
        input,
        userID,
        async (owningEntity, change) => {
          const collection = this.getRelationCollection(owningEntity, owningDef.relationCollection)
          await this.editService.setOrAddPivot(
            owningEntity.id,
            change,
            collection,
            owningDef.entity,
            owningDef.pivotEntity!,
            undefined,
            [{ id: rootId }],
          )
        },
      )
      lastChange = result.change
    }

    const rootEntity = await this.em.findOne(definition.entity, { id: rootId } as any, {
      populate: definition.populate as any,
    })

    return {
      change: lastChange,
      model: rootEntity
        ? await this.transform.entityToModel(definition.outputModel, rootEntity as never)
        : undefined,
      currentModel: rootEntity
        ? await this.transform.entityToModel(definition.outputModel, rootEntity as never)
        : undefined,
    }
  }

  /**
   * Handles removeRef for inverse-side M:N relations by delegating to the owning-side entity.
   *
   * For each target ID, loads the owning entity, updates its Change Edit, and removes the root
   * entity from the owning entity's pivot collection.
   */
  private async removeRefViaOwning(
    definition: RefEditDefinition,
    rootId: string,
    input: RemoveRefInput,
    userID: string | undefined,
    removeIDs: string[],
  ): Promise<RemoveRefOutput> {
    const owningDef = this.resolveDefinition(
      definition.owningRef!.model,
      definition.owningRef!.refModel,
      definition.owningRef!.refField,
    )

    let lastChange: ChangeModel | undefined

    for (const targetId of removeIDs) {
      const result = await this.executeMutation(
        owningDef,
        targetId,
        input,
        userID,
        async (owningEntity, change) => {
          const collection = this.getRelationCollection(owningEntity, owningDef.relationCollection)
          await this.editService.removeFromPivot(
            change,
            collection,
            owningDef.entity,
            owningDef.pivotEntity!,
            [rootId],
          )
        },
      )
      lastChange = result.change
    }

    const rootEntity = await this.em.findOne(definition.entity, { id: rootId } as any, {
      populate: definition.populate as any,
    })

    return {
      change: lastChange,
      model: rootEntity
        ? await this.transform.entityToModel(definition.outputModel, rootEntity as never)
        : undefined,
      currentModel: rootEntity
        ? await this.transform.entityToModel(definition.outputModel, rootEntity as never)
        : undefined,
    }
  }

  private normalizeAddItems(input: AddRefInput): PivotRow[] {
    if (input.ref) {
      return [{ id: input.ref, ...this.extraPayload(input.input) }]
    }

    return (input.refs ?? []).map((refID, index) => ({
      id: refID,
      ...this.extraPayload(input.inputs?.[index]),
    }))
  }

  private extraPayload(payload?: Record<string, unknown>) {
    if (!payload) {
      return {}
    }

    const extras = { ...payload }
    delete extras.id
    return extras
  }

  private getRelationCollection(entity: EditEntity, field: string): Collection<object> {
    const collection = Reflect.get(entity, field)
    if (!(collection instanceof Collection)) {
      throw BadRequestErr(
        `Field "${field}" is not a mutable relation on ${entity.constructor.name}`,
      )
    }
    return collection as Collection<object>
  }

  private async executeMutation<TRoot extends EditEntity>(
    definition: RefEditDefinition<TRoot>,
    id: string,
    input: IChangeInputWithLang,
    userID: string | undefined,
    applyMutation: (entity: TRoot, change?: ChangeEntity) => Promise<void>,
  ): Promise<AddRefOutput | RemoveRefOutput> {
    if (!userID) {
      throw BadRequestErr('User ID is required for ref edits')
    }

    const { entity, change } = await this.editService.findOneWithChangeInput(
      input,
      userID,
      definition.entity,
      { id },
      { populate: definition.populate } as never,
    )

    const editableEntity = entity as TRoot
    const original =
      change === undefined
        ? this.editService.entityToChangePOJO(definition.entity.name, editableEntity)
        : undefined

    if (change) {
      await this.editService.beginUpdateEntityEdit(change, editableEntity)
    }

    await applyMutation(editableEntity, change)

    let currentEntity: TRoot | null = null

    if (change) {
      await this.editService.updateEntityEdit(change, editableEntity)
      currentEntity = (await this.editService.findOneForChange(
        this.em,
        change,
        definition.entity,
        { id },
        { populate: definition.populate } as never,
      )) as TRoot | null
      await this.editService.persistAndMaybeTriggerReview(change)
      await this.editService.checkMerge(change, input)
    } else {
      await this.editService.createHistory(
        definition.entity.name,
        userID,
        original,
        this.editService.entityToChangePOJO(definition.entity.name, editableEntity),
      )
      await this.em.persist(editableEntity).flush()
      currentEntity = (await this.editService.findOneForChange(
        this.em,
        undefined,
        definition.entity,
        { id },
        { populate: definition.populate } as never,
      )) as TRoot | null
    }

    return {
      change: change ? await this.transform.entityToModel(ChangeModel, change) : undefined,
      model: await this.transform.entityToModel(definition.outputModel, editableEntity as never),
      currentModel: currentEntity
        ? await this.transform.entityToModel(definition.outputModel, currentEntity as never)
        : undefined,
    }
  }
}
