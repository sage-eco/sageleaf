import { Injectable } from '@nestjs/common'
import type { ValidateFunction } from 'ajv'
import Ajv2020 from 'ajv/dist/2020'
import _ from 'lodash'
import { core, z } from 'zod/v4'

import { I18nService } from '@src/common/i18n.service'
import { ZJSONObject } from '@src/common/z.schema'

export const zToSchema = (schema: core.$ZodType): core.JSONSchema.BaseSchema => {
  return z.toJSONSchema(schema, {
    io: 'input',
    override: (ctx) => {
      if (ctx.jsonSchema.id) {
        ctx.jsonSchema.$id = ctx.jsonSchema.id
        delete ctx.jsonSchema.id
      }
      const def = (ctx.zodSchema as core.$ZodTypes)._zod.def
      switch (def.type) {
        case 'union': {
          const oneOf = ctx.jsonSchema.anyOf
          delete ctx.jsonSchema.anyOf
          ctx.jsonSchema.oneOf = oneOf
        }
      }
    },
  })
}

export const ImageOrIconSchema = z.url({ protocol: /^(https|icon)/ }).optional()

/** Remove null/undefined values from a plain object (shallow). */
export function stripNulls<T extends Record<string, any>>(obj: T): Partial<T> {
  return _.omitBy(obj, (v) => v === null || v === undefined) as Partial<T>
}

/** Run an AJV validator (which strips additional properties in place) and throw if data is invalid. */
export function runAjvValidator(validator: ValidateFunction, data: unknown): void {
  if (!validator(data)) {
    throw new Error(`AJV validation failed: ${JSON.stringify(validator.errors)}`)
  }
}
export const RelMetaSchema = ZJSONObject.optional()

@Injectable()
export class BaseSchemaService {
  ajv: Ajv2020
  constructor(private readonly i18n: I18nService) {
    this.ajv = new Ajv2020({
      strict: true,
      coerceTypes: true,
      allErrors: true,
      useDefaults: true,
      removeAdditional: true,
      keywords: ['name'],
      formats: {
        date: true,
        'date-time': true,
        url: true,
        uri: true,
        nanoid: true,
      },
    })
  }

  collectionToInput(collection: Record<string, any>[], refField: string, foreignField: string) {
    return collection.map((item) => {
      const foreignValue = item[foreignField]
      const id =
        typeof foreignValue === 'object' && foreignValue !== null ? foreignValue.id : foreignValue
      const extras = _.omit(item, [refField, foreignField])
      // Strip null/undefined/empty-string from extras (MikroORM can serialize undefined as "")
      const cleanExtras = _.omitBy(extras, (v) => v === null || v === undefined || v === '')
      return { id, ...cleanExtras }
    })
  }

  /**
   * Safely extracts items from a MikroORM Collection or plain array.
   * Returns [] if the collection is uninitialized, avoiding "Collection not initialized" errors.
   */
  safeCollectionItems(collection: any): Record<string, any>[] {
    if (!collection) return []
    if (Array.isArray(collection)) return collection
    if (typeof collection.isInitialized === 'function' && collection.isInitialized()) {
      return collection.getItems()
    }
    return []
  }

  /**
   * Applies a TranslatedField (or plain string) value to `data`.
   * - Plain string → `data[plainKey] = value` (from ChangeEdit POJOs)
   * - TranslatedField `{lang: text}` → sets both:
   *   - `data[plainKey]` = current-request-lang string via `i18n.tr()`
   *   - `data[trKey]` = `[{lang, text}]` array (full translations for the form)
   */
  applyTranslatedField(
    data: Record<string, any>,
    value: string | Record<string, string> | undefined | null,
    plainKey: string,
    trKey: string,
  ): void {
    if (!value) return
    if (typeof value === 'string') {
      data[plainKey] = value
    } else {
      const tr = this.i18n.tr(value)
      if (tr) data[plainKey] = tr
      data[trKey] = Object.entries(value).map(([lang, text]) => ({ lang, text }))
    }
  }

  /** Reduce a loaded relation object on `data[field]` to only `id` plus any specified `extraFields`. */
  relToInput(data: Record<string, any>, field: string, extraFields: string[] = []): void {
    if (data[field]?.id) {
      const kept: Record<string, any> = { id: data[field].id }
      for (const f of extraFields) {
        if (data[field][f] !== undefined) {
          kept[f] = data[field][f]
        }
      }
      data[field] = kept
    }
  }

  flattenRefs(data: any) {
    _.each(data, (value, key) => {
      if (_.isPlainObject(value) && value.id && _.keys(value).length === 1) {
        data[key] = (data[key] as any).id
      }
    })
  }

  trOptionsUISchema() {
    return {
      detail: {
        type: 'VerticalLayout',
        elements: [
          {
            type: 'Control',
            scope: '#/properties/lang',
            label: this.i18n.t('schemas.translatedInput.langTitle'),
          },
          {
            type: 'Control',
            scope: '#/properties/text',
            label: this.i18n.t('schemas.translatedInput.textTitle'),
          },
        ],
      },
      showSortButtons: false,
    }
  }

  imageOrIconOptionsUISchema() {
    return {
      control: [
        {
          type: 'Icon',
        },
        {
          type: 'Source',
          format: 'IMAGE',
        },
      ],
    }
  }
}
