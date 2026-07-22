import type { JsonFormsRendererRegistryEntry, JsonSchema } from '@jsonforms/core'
import {
  and,
  hasType,
  isObjectControl,
  isOneOfControl,
  rankWith,
  schemaMatches,
  schemaSubPathMatches,
  schemaTypeIs,
  uiTypeIs,
} from '@jsonforms/core'

import EnumArrayRenderer from './EnumArrayRenderer.vue'
import ObjectRenderer from './ObjectRenderer.vue'
import OneOfRenderer from './OneOfRenderer.vue'
import ReferenceRenderer from './ReferenceRenderer.vue'
import TranslatedFieldRenderer from './TranslatedFieldRenderer.vue'

export {
  ObjectRenderer,
  OneOfRenderer,
  EnumArrayRenderer,
  ReferenceRenderer,
  TranslatedFieldRenderer,
}

const hasOneOfItems = (schema: JsonSchema): boolean =>
  schema.oneOf !== undefined &&
  schema.oneOf.length > 0 &&
  (schema.oneOf as JsonSchema[]).every((entry: JsonSchema) => {
    return entry.const !== undefined
  })

const hasEnumItems = (schema: JsonSchema): boolean =>
  schema.type === 'string' && schema.enum !== undefined

const supportedReferenceTypes = new Set([
  'Category',
  'Item',
  'Variant',
  'Component',
  'Place',
  'Region',
  'Org',
  'Material',
])

const isTranslatedArray = (schema: JsonSchema): boolean => {
  if (schema.type !== 'array') return false
  const items = schema.items
  if (!items || Array.isArray(items)) return false
  const langProp = (items as JsonSchema).properties?.lang as JsonSchema | undefined
  return langProp?.['$ref'] === '#/$defs/lang'
}

export const complexRenderers: JsonFormsRendererRegistryEntry[] = [
  { renderer: ObjectRenderer, tester: rankWith(2, isObjectControl) },
  { renderer: OneOfRenderer, tester: rankWith(3, isOneOfControl) },
  {
    renderer: EnumArrayRenderer,
    tester: rankWith(
      5,
      and(
        uiTypeIs('Control'),
        and(
          schemaMatches(
            (schema) =>
              hasType(schema, 'array') &&
              !Array.isArray(schema.items) &&
              schema.uniqueItems === true,
          ),
          schemaSubPathMatches('items', (schema) => {
            return hasOneOfItems(schema) || hasEnumItems(schema)
          }),
        ),
      ),
    ),
  },
  {
    renderer: ReferenceRenderer,
    tester: rankWith(
      2,
      and(
        uiTypeIs('Control'),
        schemaMatches((schema) => {
          const sch = schema as { $id: string }
          return (
            Object.prototype.hasOwnProperty.call(schema, '$id') &&
            supportedReferenceTypes.has(sch.$id)
          )
        }),
        schemaTypeIs('string'),
      ),
    ),
  },
  {
    renderer: TranslatedFieldRenderer,
    tester: rankWith(
      4,
      and(uiTypeIs('Control'), schemaTypeIs('array'), schemaMatches(isTranslatedArray)),
    ),
  },
]
