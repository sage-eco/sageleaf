import { BaseEntity } from '@mikro-orm/core'
import { Injectable } from '@nestjs/common'
import { ValidateFunction } from 'ajv'
import { DateTime } from 'luxon'
import { z } from 'zod/v4'

import { DeleteInput } from '@src/changes/change-ext.model'
import { ChangeInputWithLangSchema, DeleteInputSchema } from '@src/changes/change.schema'
import { Source as SourceModel } from '@src/changes/source.model'
import {
  BaseSchemaService,
  ImageOrIconSchema,
  RelMetaSchema,
  runAjvValidator,
  stripNulls,
  zToSchema,
} from '@src/common/base.schema'
import { TrArraySchema } from '@src/common/i18n'
import { I18nService } from '@src/common/i18n.service'
import { ISchemaService, IsSchemaService } from '@src/common/meta.service'
import { UISchemaElement } from '@src/common/ui.schema'
import { TransformInput, ZService } from '@src/common/z.service'
import { RegionIDSchema, Region as RegionModel } from '@src/geo/region.model'
import {
  Component as ComponentEntity,
  ComponentHistory as ComponentHistoryEntity,
  ComponentPhysicalSchema,
  ComponentsSources,
  ComponentVisualSchema,
} from '@src/process/component.entity'
import {
  Component,
  ComponentHistory,
  ComponentSource,
  CreateComponentInput,
  UpdateComponentInput,
} from '@src/process/component.model'
import { Material, MaterialIDSchema } from '@src/process/material.model'
import { TagDefinitionIDSchema } from '@src/process/tag.model'
import { User } from '@src/users/users.model'

export const ComponentIDSchema = z.string().meta({
  id: 'Component',
  name: 'Component ID',
})

export const ComponentMaterialInputSchema = z.strictObject({
  id: MaterialIDSchema,
  materialFraction: z.number().min(0.001).max(1).optional().default(1),
})

export const ComponentTagsInputSchema = z.strictObject({
  id: TagDefinitionIDSchema,
  meta: RelMetaSchema,
})

@Injectable()
@IsSchemaService(ComponentEntity)
export class ComponentSchemaService implements ISchemaService {
  OutputModel = Component
  CreateInputModel = CreateComponentInput
  UpdateInputModel = UpdateComponentInput

  ComponentMaterialInputSchema
  ComponentTagsInputSchema
  ComponentRegionInputSchema
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
    const ComponentTransform = z.transform((input: TransformInput) => {
      const entity = input.input as ComponentEntity
      const model = new Component()
      model.id = entity.id
      model.createdAt = DateTime.fromJSDate(entity.createdAt)
      model.updatedAt = DateTime.fromJSDate(entity.updatedAt)
      model.name = input.i18n.tr(entity.name)
      model.desc = input.i18n.tr(entity.desc)
      model.imageURL = entity.visual?.image
      model.region = this.zService.idRefToModel(RegionModel, entity.region)
      const primaryMaterial = this.zService.idRefToModel(Material, entity.primaryMaterial)
      if (primaryMaterial) {
        model.primaryMaterial = primaryMaterial
      }
      return model
    })
    this.zService.registerEntityTransform(ComponentEntity, Component, ComponentTransform)

    const ComponentHistoryTransform = z.transform((input: TransformInput) => {
      const entity = input.input as ComponentHistoryEntity
      const model = new ComponentHistory()
      model.datetime = DateTime.fromJSDate(entity.datetime)
      model.user = entity.user as unknown as User & {}
      model.original = entity.original as Component | undefined
      model.changes = entity.changes as Component | undefined
      return model
    })
    this.zService.registerEntityTransform(
      ComponentHistoryEntity,
      ComponentHistory,
      ComponentHistoryTransform,
    )

    const ComponentSourceTransform = z.transform((input: TransformInput) => {
      const entity = input.input as ComponentsSources
      const model = new ComponentSource()
      model.meta = entity.meta
      const source = this.zService.idRefToModel(SourceModel, entity.source)
      if (source) {
        model.source = source
      }
      return model
    })
    this.zService.registerEntityTransform(
      ComponentsSources,
      ComponentSource,
      ComponentSourceTransform,
    )

    this.ComponentMaterialInputSchema = ComponentMaterialInputSchema.meta({
      title: this.i18n.t('schemas.components.materials.item_title'),
    })

    this.ComponentTagsInputSchema = ComponentTagsInputSchema

    this.ComponentRegionInputSchema = z.strictObject({
      id: RegionIDSchema,
    })

    this.CreateSchema = ChangeInputWithLangSchema.extend({
      name: z.string().max(1024).optional(),
      nameTr: TrArraySchema.meta({
        title: this.i18n.t('schemas.components.nameTr.title'),
      }),
      desc: z.string().max(100_000).optional(),
      descTr: TrArraySchema.meta({
        title: this.i18n.t('schemas.components.descTr.title'),
      }),
      imageURL: ImageOrIconSchema.meta({
        title: this.i18n.t('schemas.components.imageURL.title'),
      }),
      visual: ComponentVisualSchema.optional(),
      physical: ComponentPhysicalSchema.optional(),
      primaryMaterial: this.ComponentMaterialInputSchema,
      materials: this.ComponentMaterialInputSchema.array()
        .optional()
        .meta({
          title: this.i18n.t('schemas.components.materials.title'),
        }),
      tags: this.ComponentTagsInputSchema.array().optional(),
      region: this.ComponentRegionInputSchema.optional(),
    })

    this.CreateJSONSchema = zToSchema(this.CreateSchema)

    this.CreateUISchema = {
      type: 'VerticalLayout',
      elements: [
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
          scope: '#/properties/imageURL',
          options: this.baseSchema.imageOrIconOptionsUISchema(),
        },
        {
          type: 'Control',
          scope: '#/properties/visual',
        },
        {
          type: 'Control',
          scope: '#/properties/physical',
        },
        {
          type: 'Control',
          scope: '#/properties/primaryMaterial',
          label: this.i18n.t('schemas.components.primaryMaterial.title'),
        },
        {
          type: 'Control',
          scope: '#/properties/materials',
        },
        {
          type: 'Control',
          scope: '#/properties/tags',
        },
        {
          type: 'Control',
          scope: '#/properties/region',
        },
      ],
    }

    this.UpdateSchema = ChangeInputWithLangSchema.extend({
      id: z.string(),
      name: z.string().max(1024).optional(),
      nameTr: TrArraySchema.meta({
        title: this.i18n.t('schemas.components.nameTr.title'),
      }),
      desc: z.string().max(100_000).optional(),
      descTr: TrArraySchema.meta({
        title: this.i18n.t('schemas.components.descTr.title'),
      }),
      imageURL: ImageOrIconSchema.meta({
        title: this.i18n.t('schemas.components.imageURL.title'),
      }),
      visual: ComponentVisualSchema.optional(),
      physical: ComponentPhysicalSchema.optional(),
      primaryMaterial: this.ComponentMaterialInputSchema.optional(),
      materials: this.ComponentMaterialInputSchema.array().optional(),
      tags: this.ComponentTagsInputSchema.array().optional(),
      addTags: this.ComponentTagsInputSchema.array().optional(),
      removeTags: TagDefinitionIDSchema.array().optional(),
      region: this.ComponentRegionInputSchema.optional(),
    })

    this.UpdateJSONSchema = zToSchema(this.UpdateSchema)

    this.UpdateUISchema = {
      type: 'VerticalLayout',
      elements: [
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
          scope: '#/properties/imageURL',
          options: this.baseSchema.imageOrIconOptionsUISchema(),
        },
        {
          type: 'Control',
          scope: '#/properties/visual',
        },
        {
          type: 'Control',
          scope: '#/properties/physical',
        },
        {
          type: 'Control',
          scope: '#/properties/primaryMaterial',
        },
        {
          type: 'Control',
          scope: '#/properties/materials',
        },
        {
          type: 'Control',
          scope: '#/properties/tags',
        },
        {
          type: 'Control',
          scope: '#/properties/region',
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
      imageURL: e.imageURL,
      visual: e.visual,
      physical: e.physical,
    })
    this.baseSchema.applyTranslatedField(data, e.name, 'name', 'nameTr')
    this.baseSchema.applyTranslatedField(data, e.desc, 'desc', 'descTr')
    data.materials = this.baseSchema.collectionToInput(
      this.baseSchema.safeCollectionItems(e.componentMaterials),
      'component',
      'material',
    )
    data.tags = this.baseSchema.collectionToInput(
      this.baseSchema.safeCollectionItems(e.componentTags),
      'component',
      'tag',
    )
    if (e.primaryMaterial?.id) data.primaryMaterial = { id: e.primaryMaterial.id }
    if (e.region?.id) data.region = { id: e.region.id }
    runAjvValidator(this.CreateValidator, data)
    this.baseSchema.relToInput(data, 'primaryMaterial', ['materialFraction'])
    return this.zService.parse(this.CreateSchema, data as any)
  }

  async updateInputModel<E extends BaseEntity>(entity: E) {
    const e = entity as any
    const data: Record<string, any> = stripNulls({
      id: e.id,
      imageURL: e.imageURL,
      visual: e.visual,
      physical: e.physical,
    })
    this.baseSchema.applyTranslatedField(data, e.name, 'name', 'nameTr')
    this.baseSchema.applyTranslatedField(data, e.desc, 'desc', 'descTr')
    data.materials = this.baseSchema.collectionToInput(
      this.baseSchema.safeCollectionItems(e.componentMaterials),
      'component',
      'material',
    )
    data.tags = this.baseSchema.collectionToInput(
      this.baseSchema.safeCollectionItems(e.componentTags),
      'component',
      'tag',
    )
    if (e.primaryMaterial?.id) data.primaryMaterial = { id: e.primaryMaterial.id }
    if (e.region?.id) data.region = { id: e.region.id }
    runAjvValidator(this.UpdateValidator, data)
    this.baseSchema.relToInput(data, 'primaryMaterial', ['materialFraction'])
    return this.zService.parse(this.UpdateSchema, data as any)
  }

  async parseCreateInput(input: CreateComponentInput): Promise<CreateComponentInput> {
    return this.zService.parse(this.CreateSchema, input)
  }

  async parseUpdateInput(input: UpdateComponentInput): Promise<UpdateComponentInput> {
    return this.zService.parse(this.UpdateSchema, input)
  }

  async parseDeleteInput(input: DeleteInput): Promise<DeleteInput> {
    return this.zService.parse(DeleteInputSchema, input)
  }
}
