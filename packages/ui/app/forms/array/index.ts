import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core'
import { rankWith, schemaTypeIs } from '@jsonforms/core'

import ArrayListRenderer from './ArrayListRenderer.vue'

export { ArrayListRenderer }

export const arrayRenderers: JsonFormsRendererRegistryEntry[] = [
  { renderer: ArrayListRenderer, tester: rankWith(2, schemaTypeIs('array')) },
]
