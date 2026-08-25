import { Injectable } from '@nestjs/common'
import { ValidateFunction } from 'ajv'
import _ from 'lodash'
import { DateTime } from 'luxon'
import { z } from 'zod/v4'

import type { Edit } from '@src/changes/change.model'
import { ChangeInputWithLangSchema } from '@src/changes/change.schema'
import { BaseSchemaService, zToSchema } from '@src/common/base.schema'
import { requireNameOrNameTr, TrArraySchema } from '@src/common/i18n'
import { I18nService } from '@src/common/i18n.service'
import { UISchemaElement } from '@src/common/ui.schema'
import { TransformInput, ZService } from '@src/common/z.service'
import { Place as PlaceEntity } from '@src/geo/place.entity'
import {
  CreatePlaceInput,
  Place,
  PlaceAddress,
  PlaceLocation,
  UpdatePlaceInput,
} from '@src/geo/place.model'
import { TagDefinitionIDSchema } from '@src/process/tag.model'
import { Org } from '@src/users/org.model'
import { OrgIDSchema } from '@src/users/org.schema'

export const PlaceIDSchema = z.string().meta({
  id: 'Place',
  name: 'Place ID',
})

export const PlaceTagsInputSchema = z.strictObject({
  id: TagDefinitionIDSchema,
})

export const PlaceOrgInputSchema = z.strictObject({
  id: OrgIDSchema,
})

@Injectable()
export class PlaceSchemaService {
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
    const PlaceTransform = z.transform((input: TransformInput) => {
      const entity = input.input as PlaceEntity
      const model = new Place()
      model.id = entity.id
      model.createdAt = DateTime.fromJSDate(entity.createdAt)
      model.updatedAt = DateTime.fromJSDate(entity.updatedAt)
      model.name = input.i18n.tr(entity.name)
      model.desc = input.i18n.tr(entity.desc)
      const addressStr = input.i18n.tr(entity.address)
      if (addressStr) {
        try {
          const parsed = JSON.parse(addressStr)
          if (typeof parsed === 'object' && parsed !== null) {
            const addr = new PlaceAddress()
            addr.housenumber = parsed.housenumber
            addr.street = parsed.street
            addr.city = parsed.city
            addr.region = parsed.region
            addr.postcode = parsed.postcode
            addr.country = parsed.country
            model.address = addr
          }
        } catch {
          // address is a plain string, not JSON
        }
      }
      if (entity.location) {
        model.location = new PlaceLocation()
        model.location.latitude = entity.location.latitude
        model.location.longitude = entity.location.longitude
      }
      model.org = this.zService.idRefToModel(Org, entity.org)
      return model
    })
    this.zService.registerEntityTransform(PlaceEntity, Place, PlaceTransform)

    this.CreateSchema = ChangeInputWithLangSchema.extend({
      name: z.string().max(1024).optional(),
      nameTr: TrArraySchema,
      desc: z.string().max(100_000).optional(),
      descTr: TrArraySchema,
      address: z.string().max(2048).optional(),
      addressTr: TrArraySchema,
      location: z.object({
        latitude: z.number(),
        longitude: z.number(),
      }),
      org: PlaceOrgInputSchema.optional(),
      tags: z.array(PlaceTagsInputSchema).optional(),
    }).superRefine(requireNameOrNameTr)
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
          scope: '#/properties/addressTr',
          options: this.baseSchema.trOptionsUISchema(),
        },
        {
          type: 'Control',
          scope: '#/properties/location',
        },
        {
          type: 'Control',
          scope: '#/properties/org',
        },
        {
          type: 'Control',
          scope: '#/properties/tags',
        },
      ],
    }

    this.UpdateSchema = ChangeInputWithLangSchema.extend({
      id: PlaceIDSchema,
      name: z.string().max(1024).optional(),
      nameTr: TrArraySchema,
      desc: z.string().max(100_000).optional(),
      descTr: TrArraySchema,
      address: z.string().max(2048).optional(),
      addressTr: TrArraySchema,
      location: z
        .object({
          latitude: z.number(),
          longitude: z.number(),
        })
        .optional(),
      org: PlaceOrgInputSchema.optional(),
      tags: z.array(PlaceTagsInputSchema).optional(),
      addTags: z.array(PlaceTagsInputSchema).optional(),
      removeTags: TagDefinitionIDSchema.array().optional(),
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
          scope: '#/properties/addressTr',
          options: this.baseSchema.trOptionsUISchema(),
        },
        {
          type: 'Control',
          scope: '#/properties/location',
        },
        {
          type: 'Control',
          scope: '#/properties/org',
        },
        {
          type: 'Control',
          scope: '#/properties/tags',
        },
      ],
    }
    this.CreateValidator = this.baseSchema.ajv.compile(this.CreateJSONSchema)
    this.UpdateValidator = this.baseSchema.ajv.compile(this.UpdateJSONSchema)
  }

  async placeCreateEdit(edit: Edit) {
    const data = _.cloneDeep(edit.changes)
    this.CreateValidator(data)
    return data
  }

  async placeUpdateEdit(edit: Edit) {
    const data: Record<string, any> | undefined = _.cloneDeep(edit.changes)
    if (data) {
      data.tags = this.baseSchema.collectionToInput(data.place_tags || [], 'place', 'tag')
    }
    this.UpdateValidator(data)
    return data
  }

  async parseCreateInput(input: CreatePlaceInput) {
    return this.zService.parse(this.CreateSchema, input)
  }

  async parseUpdateInput(input: UpdatePlaceInput) {
    return this.zService.parse(this.UpdateSchema, input)
  }
}
