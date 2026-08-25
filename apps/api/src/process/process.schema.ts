import { BaseEntity } from '@mikro-orm/core'
import { Injectable } from '@nestjs/common'
import { ValidateFunction } from 'ajv'
import { DateTime } from 'luxon'
import { z } from 'zod/v4'

import { DeleteInput } from '@src/changes/change-ext.model'
import { ChangeInputWithLangSchema, DeleteInputSchema } from '@src/changes/change.schema'
import { Source as SourceModel } from '@src/changes/source.model'
import { BaseSchemaService, runAjvValidator, stripNulls, zToSchema } from '@src/common/base.schema'
import { requireNameOrNameTr, TrArraySchema } from '@src/common/i18n'
import { I18nService } from '@src/common/i18n.service'
import { ISchemaService, IsSchemaService } from '@src/common/meta.service'
import { UISchemaElement } from '@src/common/ui.schema'
import { TransformInput, ZService } from '@src/common/z.service'
import { Place } from '@src/geo/place.model'
import { PlaceIDSchema } from '@src/geo/place.schema'
import { Region, RegionIDSchema } from '@src/geo/region.model'
import { Material, MaterialIDSchema } from '@src/process/material.model'
import {
  ProcessEfficiencySchema,
  Process as ProcessEntity,
  ProcessHistory as ProcessHistoryEntity,
  ProcessInstructionsSchema,
  ProcessIntent,
  ProcessRulesSchema,
  ProcessSources,
} from '@src/process/process.entity'
import {
  CreateProcessInput,
  Process,
  ProcessEfficiency,
  ProcessHistory,
  ProcessSource,
  UpdateProcessInput,
} from '@src/process/process.model'
import { RecyclingStream, StreamScore } from '@src/process/stream.model'
import { Variant } from '@src/product/variant.model'
import { VariantIDSchema } from '@src/product/variant.schema'
import { Org } from '@src/users/org.model'
import { OrgIDSchema } from '@src/users/org.schema'
import { User } from '@src/users/users.model'

export const ProcessIDSchema = z.string().meta({
  id: 'Process',
  name: 'Process ID',
})

@Injectable()
@IsSchemaService(ProcessEntity)
export class ProcessSchemaService implements ISchemaService {
  OutputModel = Process
  CreateInputModel = CreateProcessInput
  UpdateInputModel = UpdateProcessInput

  ProcessMaterialInputSchema
  ProcessVariantInputSchema
  ProcessOrgInputSchema
  ProcessRegionInputSchema
  ProcessPlaceInputSchema
  CreateSchema
  CreateJSONSchema: z.core.JSONSchema.BaseSchema
  CreateValidator: ValidateFunction
  CreateUISchema: UISchemaElement
  UpdateSchema
  UpdateJSONSchema: z.core.JSONSchema.BaseSchema
  UpdateValidator: ValidateFunction
  UpdateUISchema: UISchemaElement

  constructor(
    private readonly i18n: I18nService,
    private readonly baseSchema: BaseSchemaService,
    private readonly zService: ZService,
  ) {
    const ProcessTransform = z.transform((input: TransformInput) => {
      const entity = input.input as ProcessEntity & Record<string, any>
      const model = new Process()
      model.id = entity.id
      model.createdAt = DateTime.fromJSDate(entity.createdAt)
      model.updatedAt = DateTime.fromJSDate(entity.updatedAt)
      model.intent = entity.intent
      model.name = input.i18n.tr(entity.name)
      model.desc = input.i18n.tr(entity.desc)
      if (entity.efficiency) {
        const eff = new ProcessEfficiency()
        eff.efficiency = entity.efficiency.efficiency
        eff.equivalency = entity.efficiency.equivalency
        eff.valueRatio = entity.efficiency.valueRatio
        model.efficiency = eff
      }
      model.material = this.zService.idRefToModel(Material, entity.material)
      model.variant = this.zService.idRefToModel(Variant, entity.variant)
      model.org = this.zService.idRefToModel(Org, entity.org)
      model.region = this.zService.idRefToModel(Region, entity.region)
      model.place = this.zService.idRefToModel(Place, entity.place)
      return model
    })
    this.zService.registerEntityTransform(ProcessEntity, Process, ProcessTransform)

    const StreamScoreTransform = z.transform((input: TransformInput) => {
      const obj = input.input as any
      const model = new StreamScore()
      model.score = obj.score
      model.minScore = obj.minScore
      model.maxScore = obj.maxScore
      model.rating = obj.rating
      model.ratingF = obj.ratingF
      model.dataQuality = obj.dataQuality
      model.dataQualityF = obj.dataQualityF
      model.name = input.i18n.tr(obj.name)
      return model
    })
    this.zService.registerObjectTransform(StreamScore, StreamScoreTransform)

    const RecyclingStreamTransform = z.transform(async (input: TransformInput) => {
      const obj = input.input as any
      const model = new RecyclingStream()
      model.name = input.i18n.tr(obj.name)
      model.desc = input.i18n.tr(obj.desc)
      if (obj.score) {
        model.score = await this.zService.objectToModel(StreamScore, obj.score)
      }
      if (obj.scores) {
        model.scores = await Promise.all(
          obj.scores.map((s: any) => this.zService.objectToModel(StreamScore, s)),
        )
      }
      model.container = obj.container
      return model
    })
    this.zService.registerObjectTransform(RecyclingStream, RecyclingStreamTransform)

    const ProcessHistoryTransform = z.transform((input: TransformInput) => {
      const entity = input.input as ProcessHistoryEntity
      const model = new ProcessHistory()
      model.datetime = DateTime.fromJSDate(entity.datetime)
      model.user = entity.user as unknown as User & {}
      model.original = entity.original as Process | undefined
      model.changes = entity.changes as Process | undefined
      return model
    })
    this.zService.registerEntityTransform(
      ProcessHistoryEntity,
      ProcessHistory,
      ProcessHistoryTransform,
    )

    const ProcessSourceTransform = z.transform((input: TransformInput) => {
      const entity = input.input as ProcessSources
      const model = new ProcessSource()
      model.meta = entity.meta
      const source = this.zService.idRefToModel(SourceModel, entity.source)
      if (source) {
        model.source = source
      }
      return model
    })
    this.zService.registerEntityTransform(ProcessSources, ProcessSource, ProcessSourceTransform)

    this.ProcessMaterialInputSchema = z.strictObject({
      id: MaterialIDSchema,
    })
    this.ProcessVariantInputSchema = z.strictObject({
      id: VariantIDSchema,
    })
    this.ProcessOrgInputSchema = z.strictObject({
      id: OrgIDSchema,
    })
    this.ProcessRegionInputSchema = z.strictObject({
      id: RegionIDSchema,
    })
    this.ProcessPlaceInputSchema = z.strictObject({
      id: PlaceIDSchema,
    })
    this.CreateSchema = ChangeInputWithLangSchema.extend({
      intent: z.enum(ProcessIntent),
      name: z.string().max(1024).optional(),
      nameTr: TrArraySchema.optional(),
      desc: z.string().max(100_000).optional(),
      descTr: TrArraySchema.optional(),
      instructions: ProcessInstructionsSchema,
      efficiency: ProcessEfficiencySchema.optional(),
      rules: ProcessRulesSchema.optional(),
      material: this.ProcessMaterialInputSchema.optional(),
      variant: this.ProcessVariantInputSchema.optional(),
      org: this.ProcessOrgInputSchema.optional(),
      region: this.ProcessRegionInputSchema.optional(),
      place: this.ProcessPlaceInputSchema.optional(),
    }).superRefine(requireNameOrNameTr)
    this.CreateJSONSchema = zToSchema(this.CreateSchema)
    this.CreateUISchema = {
      type: 'VerticalLayout',
      elements: [
        {
          type: 'Control',
          scope: '#/properties/intent',
        },
        {
          type: 'Control',
          scope: '#/properties/nameTr',
          options: this.baseSchema.trOptionsUISchema(),
        },
        {
          type: 'Control',
          scope: '#/properties/descTr',
          options: this.baseSchema.trOptionsUISchema(),
        },
        {
          type: 'Control',
          scope: '#/properties/instructions',
        },
        {
          type: 'Control',
          scope: '#/properties/efficiency',
        },
        {
          type: 'Control',
          scope: '#/properties/rules',
        },
        {
          type: 'Control',
          scope: '#/properties/material',
        },
        {
          type: 'Control',
          scope: '#/properties/variant',
        },
        {
          type: 'Control',
          scope: '#/properties/org',
        },
        {
          type: 'Control',
          scope: '#/properties/region',
        },
        {
          type: 'Control',
          scope: '#/properties/place',
        },
      ],
    }

    this.UpdateSchema = ChangeInputWithLangSchema.extend({
      id: ProcessIDSchema,
      intent: z.enum(ProcessIntent).optional(),
      name: z.string().max(1024).optional(),
      nameTr: TrArraySchema.optional(),
      desc: z.string().max(100_000).optional(),
      descTr: TrArraySchema.optional(),
      instructions: ProcessInstructionsSchema.optional(),
      efficiency: ProcessEfficiencySchema.optional(),
      rules: ProcessRulesSchema.optional(),
      material: this.ProcessMaterialInputSchema.optional(),
      variant: this.ProcessVariantInputSchema.optional(),
      org: this.ProcessOrgInputSchema.optional(),
      region: this.ProcessRegionInputSchema.optional(),
      place: this.ProcessPlaceInputSchema.optional(),
    })
    this.UpdateJSONSchema = zToSchema(this.UpdateSchema)
    this.UpdateUISchema = {
      type: 'VerticalLayout',
      elements: [
        {
          type: 'Control',
          scope: '#/properties/intent',
        },
        {
          type: 'Control',
          scope: '#/properties/nameTr',
          options: this.baseSchema.trOptionsUISchema(),
        },
        {
          type: 'Control',
          scope: '#/properties/descTr',
          options: this.baseSchema.trOptionsUISchema(),
        },
        {
          type: 'Control',
          scope: '#/properties/instructions',
        },
        {
          type: 'Control',
          scope: '#/properties/efficiency',
        },
        {
          type: 'Control',
          scope: '#/properties/rules',
        },
        {
          type: 'Control',
          scope: '#/properties/material',
        },
        {
          type: 'Control',
          scope: '#/properties/variant',
        },
        {
          type: 'Control',
          scope: '#/properties/org',
        },
        {
          type: 'Control',
          scope: '#/properties/region',
        },
        {
          type: 'Control',
          scope: '#/properties/place',
        },
      ],
    }
    this.CreateValidator = this.baseSchema.ajv.compile(this.CreateJSONSchema)
    this.UpdateValidator = this.baseSchema.ajv.compile(this.UpdateJSONSchema)
  }

  async createInputModel<E extends BaseEntity>(entity: E | null) {
    if (!entity) {
      return {}
    }
    const e = entity as any
    const data: Record<string, any> = stripNulls({
      intent: e.intent,
      instructions: e.instructions,
      efficiency: e.efficiency,
      rules: e.rules,
    })
    this.baseSchema.applyTranslatedField(data, e.name, 'name', 'nameTr')
    this.baseSchema.applyTranslatedField(data, e.desc, 'desc', 'descTr')
    for (const field of ['material', 'variant', 'org', 'region', 'place']) {
      if (e[field]?.id) data[field] = { id: e[field].id }
    }
    runAjvValidator(this.CreateValidator, data)
    return this.zService.parse(this.CreateSchema, data as any)
  }

  async updateInputModel<E extends BaseEntity>(entity: E) {
    const e = entity as any
    const data: Record<string, any> = stripNulls({
      id: e.id,
      intent: e.intent,
      instructions: e.instructions,
      efficiency: e.efficiency,
      rules: e.rules,
    })
    this.baseSchema.applyTranslatedField(data, e.name, 'name', 'nameTr')
    this.baseSchema.applyTranslatedField(data, e.desc, 'desc', 'descTr')
    for (const field of ['material', 'variant', 'org', 'region', 'place']) {
      if (e[field]?.id) data[field] = { id: e[field].id }
    }
    runAjvValidator(this.UpdateValidator, data)
    return this.zService.parse(this.UpdateSchema, data as any)
  }

  async parseCreateInput(input: CreateProcessInput): Promise<CreateProcessInput> {
    return this.zService.parse(this.CreateSchema, input)
  }

  async parseUpdateInput(input: UpdateProcessInput): Promise<UpdateProcessInput> {
    return this.zService.parse(this.UpdateSchema, input)
  }

  async parseDeleteInput(input: DeleteInput): Promise<DeleteInput> {
    return this.zService.parse(DeleteInputSchema, input)
  }
}
