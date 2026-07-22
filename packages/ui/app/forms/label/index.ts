import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core'
import { rankWith, uiTypeIs } from '@jsonforms/core'

import LabelRenderer from './LabelRenderer.vue'

export { LabelRenderer }

export const labelRenderers: JsonFormsRendererRegistryEntry[] = [
  { renderer: LabelRenderer, tester: rankWith(1, uiTypeIs('Label')) },
]
