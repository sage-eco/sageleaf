import { Injectable } from '@nestjs/common'
import { DateTime } from 'luxon'
import { z } from 'zod/v4'

import { CreateChangeInput } from '@src/changes/change-ext.model'
import { RefModelTypeSchema } from '@src/changes/change-type.schema'
import { ChangeEdits, Change as ChangeEntity, ChangeStatus } from '@src/changes/change.entity'
import { Change, Edit, UpdateChangeInput } from '@src/changes/change.model'
import { EditService } from '@src/changes/edit.service'
import { AddRefInput, RemoveRefInput } from '@src/changes/ref-edit.model'
import { ZJSONObject } from '@src/common/z.schema'
import { TransformInput, ZService } from '@src/common/z.service'
import { LangSchema } from '@src/graphql/base.model'
import { User } from '@src/users/users.model'

export const ChangeIDSchema = z.string().meta({
  id: 'Change',
  title: 'Change ID',
})

export const CreateChangeInputSchema = z.object({
  title: z.string().min(1).max(1000).optional(),
  description: z.string().max(100000).optional(),
  status: z.enum(ChangeStatus).optional(),
  sources: z.array(z.nanoid()).optional(),
})
export const CreateChangeInputJSONSchema = z.toJSONSchema(CreateChangeInputSchema)

export const UpdateChangeInputSchema = z.object({
  id: z.nanoid(),
  title: z.string().max(1000).optional(),
  description: z.string().max(100_000).optional(),
  status: z.enum(ChangeStatus).optional(),
  sources: z.array(z.nanoid()).optional(),
})
export const UpdateChangeInputJSONSchema = z.toJSONSchema(UpdateChangeInputSchema)

export const SourceInputSchema = z.object({
  id: z.nanoid(),
  meta: z.record(z.string(), z.json()).optional(),
})

export const DeleteInputSchema = z.object({
  id: z.nanoid(),
  changeID: z.nanoid().optional(),
  change: CreateChangeInputSchema.optional(),
  addSources: SourceInputSchema.array().optional(),
  removeSources: z.array(z.nanoid()).optional(),
  apply: z.boolean().optional(),
})

export const ChangeInputWithLangSchema = z.object({
  changeID: z.nanoid().optional(),
  change: CreateChangeInputSchema.optional(),
  addSources: SourceInputSchema.array().optional(),
  removeSources: z.array(z.nanoid()).optional(),
  apply: z.boolean().optional(),
  lang: LangSchema,
})

export const AddRefInputSchema = ChangeInputWithLangSchema.extend({
  refModel: RefModelTypeSchema,
  refField: z.string().optional(),
  ref: z.nanoid().optional(),
  refs: z.array(z.nanoid()).min(1).optional(),
  input: ZJSONObject.optional(),
  inputs: z.array(ZJSONObject).min(1).optional(),
}).superRefine((input, ctx) => {
  const hasRef = !!input.ref
  const hasRefs = !!input.refs?.length

  if (!hasRef && !hasRefs) {
    ctx.addIssue({
      code: 'custom',
      path: ['ref'],
      message: 'Provide either ref or refs',
    })
  }
  if (hasRef && hasRefs) {
    ctx.addIssue({
      code: 'custom',
      path: ['ref'],
      message: 'Provide either ref or refs, not both',
    })
  }
  if (input.input && !hasRef) {
    ctx.addIssue({
      code: 'custom',
      path: ['input'],
      message: 'input can only be used together with ref',
    })
  }
  if (input.inputs && !hasRefs) {
    ctx.addIssue({
      code: 'custom',
      path: ['inputs'],
      message: 'inputs can only be used together with refs',
    })
  }
  if (hasRef && input.inputs) {
    ctx.addIssue({
      code: 'custom',
      path: ['inputs'],
      message: 'inputs cannot be used together with ref',
    })
  }
  if (hasRefs && input.input) {
    ctx.addIssue({
      code: 'custom',
      path: ['input'],
      message: 'input cannot be used together with refs',
    })
  }
  if (input.refs && input.inputs && input.refs.length !== input.inputs.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['inputs'],
      message: 'inputs must have the same length as refs',
    })
  }
})

export const RemoveRefInputSchema = ChangeInputWithLangSchema.extend({
  refModel: RefModelTypeSchema,
  refField: z.string().optional(),
  ref: z.nanoid().optional(),
  refs: z.array(z.nanoid()).min(1).optional(),
}).superRefine((input, ctx) => {
  const hasRef = !!input.ref
  const hasRefs = !!input.refs?.length

  if (!hasRef && !hasRefs) {
    ctx.addIssue({
      code: 'custom',
      path: ['ref'],
      message: 'Provide either ref or refs',
    })
  }
  if (hasRef && hasRefs) {
    ctx.addIssue({
      code: 'custom',
      path: ['ref'],
      message: 'Provide either ref or refs, not both',
    })
  }
})

@Injectable()
export class ChangeSchemaService {
  CreateSchema = CreateChangeInputSchema
  UpdateSchema = UpdateChangeInputSchema
  AddRefSchema = AddRefInputSchema
  RemoveRefSchema = RemoveRefInputSchema

  constructor(
    private readonly zService: ZService,
    private readonly editService: EditService,
  ) {
    const ChangeTransform = z.transform((input: TransformInput) => {
      const entity = input.input as ChangeEntity
      const model = new Change()
      model.id = entity.id
      model.createdAt = DateTime.fromJSDate(entity.createdAt)
      model.updatedAt = DateTime.fromJSDate(entity.updatedAt)
      model.title = entity.title
      model.description = entity.description
      model.status = entity.status
      const user = new User()
      user.id = entity.user.id
      model.user = user
      return model
    })
    this.zService.registerEntityTransform(ChangeEntity, Change, ChangeTransform)

    const EditTransform = z.transform(async (input: TransformInput) => {
      const entity = input.input as ChangeEdits
      const model = new Edit()
      model.entityName = entity.entityName
      model.id = entity.entityID
      if (entity.original) {
        model.original = (await this.zService.objectToModel(
          entity.entityName,
          entity.original,
        )) as typeof model.original
      }
      const effectiveChanges = this.editService.effectiveChanges(entity)
      if (effectiveChanges) {
        model.changes = (await this.zService.objectToModel(
          entity.entityName,
          effectiveChanges,
        )) as typeof model.changes
      }
      return model
    })
    this.zService.registerEntityTransform(ChangeEdits, Edit, EditTransform)
  }

  async parseCreateInput(input: CreateChangeInput): Promise<CreateChangeInput> {
    return this.zService.parse(this.CreateSchema, input)
  }

  async parseUpdateInput(input: UpdateChangeInput): Promise<UpdateChangeInput> {
    return this.zService.parse(this.UpdateSchema, input)
  }

  async parseAddRefInput(input: AddRefInput): Promise<AddRefInput> {
    // TS enum and Zod enum don't seem to work well
    return (await this.zService.parse(this.AddRefSchema, input)) as AddRefInput
  }

  async parseRemoveRefInput(input: RemoveRefInput): Promise<RemoveRefInput> {
    // TS enum and Zod enum don't seem to work well
    return (await this.zService.parse(this.RemoveRefSchema, input)) as RemoveRefInput
  }
}
