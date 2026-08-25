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
  RelMetaSchema,
  runAjvValidator,
  stripNulls,
  zToSchema,
} from '@src/common/base.schema'
import { requireNameOrNameTr, TrArraySchema } from '@src/common/i18n'
import { I18nService } from '@src/common/i18n.service'
import { ISchemaService, IsSchemaService } from '@src/common/meta.service'
import { UISchemaElement } from '@src/common/ui.schema'
import { TransformInput, ZService } from '@src/common/z.service'
import { TagDefinitionIDSchema } from '@src/process/tag.model'
import { CategoryIDSchema } from '@src/product/category.schema'
import { Item as ItemEntity, ItemHistory as ItemHistoryEntity } from '@src/product/item.entity'
import { CreateItemInput, Item, ItemHistory, UpdateItemInput } from '@src/product/item.model'
import { User } from '@src/users/users.model'

export const ItemIDSchema = z.string().meta({
  id: 'Item',
  name: 'Item ID',
})

export const ItemCategoriesInputSchema = z.strictObject({
  id: CategoryIDSchema,
})

export const ItemTagsInputSchema = z.strictObject({
  id: TagDefinitionIDSchema,
  meta: RelMetaSchema,
})

@Injectable()
@IsSchemaService(ItemEntity)
export class ItemSchemaService implements ISchemaService {
  OutputModel = Item
  CreateInputModel = CreateItemInput
  UpdateInputModel = UpdateItemInput

  ItemCategoriesInputSchema
  ItemTagsInputSchema
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
    const ItemTransform = z.transform((input: TransformInput) => {
      const entity = input.input as ItemEntity
      const model = new Item()
      model.id = entity.id
      model.createdAt = DateTime.fromJSDate(entity.createdAt)
      model.updatedAt = DateTime.fromJSDate(entity.updatedAt)
      model.name = input.i18n.tr(entity.name)
      model.desc = input.i18n.tr(entity.desc)
      model.imageURL = entity.files?.thumbnail
      return model
    })
    this.zService.registerEntityTransform(ItemEntity, Item, ItemTransform)

    const ItemHistoryTransform = z.transform((input: TransformInput) => {
      const entity = input.input as ItemHistoryEntity
      const model = new ItemHistory()
      model.datetime = DateTime.fromJSDate(entity.datetime)
      model.user = entity.user as unknown as User & {}
      model.original = entity.original as Item | undefined
      model.changes = entity.changes as Item | undefined
      return model
    })
    this.zService.registerEntityTransform(ItemHistoryEntity, ItemHistory, ItemHistoryTransform)

    this.ItemCategoriesInputSchema = ItemCategoriesInputSchema
    this.ItemTagsInputSchema = ItemTagsInputSchema

    this.CreateSchema = ChangeInputWithLangSchema.extend({
      name: z.string().min(1).max(100).optional(),
      nameTr: TrArraySchema,
      desc: z.string().max(100_000).optional(),
      descTr: TrArraySchema,
      imageURL: ImageOrIconSchema,
      categories: z.array(this.ItemCategoriesInputSchema).optional(),
      tags: z.array(this.ItemTagsInputSchema).optional(),
    }).superRefine(requireNameOrNameTr)

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
          scope: '#/properties/descTr',
          label: 'Description Translations',
          options: this.baseSchema.trOptionsUISchema(),
        },
        {
          type: 'Control',
          scope: '#/properties/imageURL',
          label: 'Image',
        },
        {
          type: 'Control',
          scope: '#/properties/categories',
          label: 'Categories',
        },
        {
          type: 'Control',
          scope: '#/properties/tags',
          label: 'Tags',
        },
      ],
    }

    this.UpdateSchema = ChangeInputWithLangSchema.extend({
      id: ItemIDSchema,
      name: z.string().min(1).max(100).optional(),
      nameTr: TrArraySchema.optional(),
      desc: z.string().max(100_000).optional(),
      descTr: TrArraySchema.optional(),
      imageURL: ImageOrIconSchema,
      categories: z.array(this.ItemCategoriesInputSchema).optional(),
      addCategories: z.array(this.ItemCategoriesInputSchema).optional(),
      removeCategories: z.array(z.string()).optional(),
      tags: z.array(this.ItemTagsInputSchema).optional(),
      addTags: z.array(this.ItemTagsInputSchema).optional(),
      removeTags: z.array(z.string()).optional(),
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
          scope: '#/properties/descTr',
          label: 'Description Translations',
          options: this.baseSchema.trOptionsUISchema(),
        },
        {
          type: 'Control',
          scope: '#/properties/imageURL',
          label: 'Image',
        },
        {
          type: 'Control',
          scope: '#/properties/categories',
          label: 'Categories',
        },
        {
          type: 'Control',
          scope: '#/properties/tags',
          label: 'Tags',
        },
      ],
    }
    this.CreateValidator = this.baseSchema.ajv.compile(this.CreateJSONSchema)
    this.UpdateValidator = this.baseSchema.ajv.compile(this.UpdateJSONSchema)
  }

  async createInputModel<E extends BaseEntity>(entity: E | null) {
    if (!entity) return {}
    const e = entity as any
    const data: Record<string, any> = stripNulls({
      imageURL: e.files?.thumbnail ?? e.imageURL,
    })
    this.baseSchema.applyTranslatedField(data, e.name, 'name', 'nameTr')
    this.baseSchema.applyTranslatedField(data, e.desc, 'desc', 'descTr')
    data.categories = this.baseSchema.collectionToInput(
      this.baseSchema.safeCollectionItems(e.itemCategories),
      'item',
      'category',
    )
    data.tags = this.baseSchema.collectionToInput(
      this.baseSchema.safeCollectionItems(e.itemTags),
      'item',
      'tag',
    )
    runAjvValidator(this.CreateValidator, data)
    return this.zService.parse(this.CreateSchema, data as any)
  }

  async updateInputModel<E extends BaseEntity>(entity: E) {
    const e = entity as any
    const data: Record<string, any> = stripNulls({
      id: e.id,
      imageURL: e.files?.thumbnail ?? e.imageURL,
    })
    this.baseSchema.applyTranslatedField(data, e.name, 'name', 'nameTr')
    this.baseSchema.applyTranslatedField(data, e.desc, 'desc', 'descTr')
    data.categories = this.baseSchema.collectionToInput(
      this.baseSchema.safeCollectionItems(e.itemCategories),
      'item',
      'category',
    )
    data.tags = this.baseSchema.collectionToInput(
      this.baseSchema.safeCollectionItems(e.itemTags),
      'item',
      'tag',
    )
    runAjvValidator(this.UpdateValidator, data)
    return this.zService.parse(this.UpdateSchema, data as any)
  }

  async parseCreateInput(input: CreateItemInput): Promise<CreateItemInput> {
    return this.zService.parse(this.CreateSchema, input)
  }

  async parseUpdateInput(input: UpdateItemInput): Promise<UpdateItemInput> {
    return this.zService.parse(this.UpdateSchema, input)
  }

  async parseDeleteInput(input: DeleteInput): Promise<DeleteInput> {
    return this.zService.parse(DeleteInputSchema, input)
  }
}
