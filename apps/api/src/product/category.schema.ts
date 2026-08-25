import { BaseEntity } from '@mikro-orm/core'
import { Injectable } from '@nestjs/common'
import { ValidateFunction } from 'ajv'
import { DateTime } from 'luxon'
import { z } from 'zod/v4'

import { DeleteInput } from '@src/changes/change-ext.model'
import { ChangeInputWithLangSchema, DeleteInputSchema } from '@src/changes/change.schema'
import {
  BaseSchemaService,
  ImageOrIconSchema,
  runAjvValidator,
  stripNulls,
  zToSchema,
} from '@src/common/base.schema'
import { TrArraySchema } from '@src/common/i18n'
import { I18nService } from '@src/common/i18n.service'
import { ISchemaService, IsSchemaService } from '@src/common/meta.service'
import { UISchemaElement } from '@src/common/ui.schema'
import { TransformInput, ZService } from '@src/common/z.service'
import {
  Category as CategoryEntity,
  CategoryHistory as CategoryHistoryEntity,
} from '@src/product/category.entity'
import {
  Category,
  CategoryHistory,
  CreateCategoryInput,
  UpdateCategoryInput,
} from '@src/product/category.model'
import { User } from '@src/users/users.model'

export const CategoryIDSchema = z.string().meta({
  id: 'Category',
  name: 'Category ID',
})

@Injectable()
@IsSchemaService(CategoryEntity)
export class CategorySchemaService implements ISchemaService {
  OutputModel = Category
  CreateInputModel = CreateCategoryInput
  UpdateInputModel = UpdateCategoryInput

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
    const CategoryTransform = z.transform((input: TransformInput) => {
      const entity = input.input as CategoryEntity
      const model = new Category()
      model.id = entity.id
      model.createdAt = DateTime.fromJSDate(entity.createdAt)
      model.updatedAt = DateTime.fromJSDate(entity.updatedAt)
      model.name = input.i18n.tr(entity.name) as string
      model.nameTr = entity.name
        ? Object.entries(entity.name).map(([key, text]) => ({
            lang: key.split(';')[0],
            text: text as string,
            auto: key.endsWith(';a'),
          }))
        : undefined
      model.descShort = input.i18n.tr(entity.descShort)
      model.descShortTr = entity.descShort
        ? Object.entries(entity.descShort).map(([key, text]) => ({
            lang: key.split(';')[0],
            text: text as string,
            auto: key.endsWith(';a'),
          }))
        : undefined
      model.desc = input.i18n.tr(entity.desc)
      model.descTr = entity.desc
        ? Object.entries(entity.desc).map(([key, text]) => ({
            lang: key.split(';')[0],
            text: text as string,
            auto: key.endsWith(';a'),
          }))
        : undefined
      model.imageURL = entity.imageURL
      return model
    })
    this.zService.registerEntityTransform(CategoryEntity, Category, CategoryTransform)

    const CategoryHistoryTransform = z.transform((input: TransformInput) => {
      const entity = input.input as CategoryHistoryEntity
      const model = new CategoryHistory()
      model.datetime = DateTime.fromJSDate(entity.datetime)
      model.user = entity.user as unknown as User & {}
      model.original = entity.original as Category | undefined
      model.changes = entity.changes as Category | undefined
      return model
    })
    this.zService.registerEntityTransform(
      CategoryHistoryEntity,
      CategoryHistory,
      CategoryHistoryTransform,
    )

    this.CreateSchema = ChangeInputWithLangSchema.extend({
      name: z.string().max(1024).optional(),
      nameTr: TrArraySchema,
      descShort: z.string().max(1024).optional(),
      descShortTr: TrArraySchema,
      desc: z.string().max(100_000).optional(),
      descTr: TrArraySchema,
      imageURL: ImageOrIconSchema,
    })

    this.CreateJSONSchema = zToSchema(this.CreateSchema)

    this.CreateUISchema = {
      type: 'VerticalLayout',
      elements: [
        {
          type: 'Control',
          scope: '#/properties/nameTr',
          label: 'Name Translations',
          options: this.baseSchema.trOptionsUISchema(),
        },
        {
          type: 'Control',
          scope: '#/properties/descShortTr',
          label: 'Short Description Translations',
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
      ],
    }

    this.UpdateSchema = ChangeInputWithLangSchema.extend({
      id: z.string(),
      name: z.string().max(1024).optional(),
      nameTr: TrArraySchema,
      descShort: z.string().max(1024).optional(),
      descShortTr: TrArraySchema,
      desc: z.string().max(100_000).optional(),
      descTr: TrArraySchema,
      imageURL: ImageOrIconSchema,
    })

    this.UpdateJSONSchema = zToSchema(this.UpdateSchema)

    this.UpdateUISchema = {
      type: 'VerticalLayout',
      elements: [
        {
          type: 'Control',
          scope: '#/properties/nameTr',
          label: 'Name Translations',
          options: this.baseSchema.trOptionsUISchema(),
        },
        {
          type: 'Control',
          scope: '#/properties/descShortTr',
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
      ],
    }

    this.CreateValidator = this.baseSchema.ajv.compile(this.CreateJSONSchema)
    this.UpdateValidator = this.baseSchema.ajv.compile(this.UpdateJSONSchema)
  }

  async createInputModel<E extends BaseEntity>(_entity: E | null) {
    const data = {}
    runAjvValidator(this.CreateValidator, data)
    return this.zService.parse(this.CreateSchema, data)
  }

  async updateInputModel<E extends BaseEntity>(entity: E) {
    const e = entity as any
    const data: Record<string, any> = stripNulls({ id: e.id, imageURL: e.imageURL })
    this.baseSchema.applyTranslatedField(data, e.name, 'name', 'nameTr')
    this.baseSchema.applyTranslatedField(data, e.descShort, 'descShort', 'descShortTr')
    this.baseSchema.applyTranslatedField(data, e.desc, 'desc', 'descTr')
    runAjvValidator(this.UpdateValidator, data)
    return this.zService.parse(this.UpdateSchema, data as any)
  }

  async parseCreateInput(input: CreateCategoryInput): Promise<CreateCategoryInput> {
    return this.zService.parse(this.CreateSchema, input)
  }

  async parseUpdateInput(input: UpdateCategoryInput): Promise<UpdateCategoryInput> {
    return this.zService.parse(this.UpdateSchema, input)
  }

  async parseDeleteInput(input: DeleteInput): Promise<DeleteInput> {
    return this.zService.parse(DeleteInputSchema, input)
  }
}
