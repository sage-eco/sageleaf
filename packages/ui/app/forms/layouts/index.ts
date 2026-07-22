import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core'
import {
  and,
  categorizationHasCategory,
  isCategorization,
  isLayout,
  optionIs,
  rankWith,
  uiTypeIs,
} from '@jsonforms/core'

import CategorizationRenderer from './CategorizationRenderer.vue'
import CategorizationStepperRenderer from './CategorizationStepperRenderer.vue'
import GroupRenderer from './GroupRenderer.vue'
import LayoutRenderer from './LayoutRenderer.vue'

export { LayoutRenderer, GroupRenderer, CategorizationRenderer, CategorizationStepperRenderer }

export const layoutRenderers: JsonFormsRendererRegistryEntry[] = [
  { renderer: LayoutRenderer, tester: rankWith(1, isLayout) },
  { renderer: GroupRenderer, tester: rankWith(2, and(isLayout, uiTypeIs('Group'))) },
  {
    renderer: CategorizationRenderer,
    tester: rankWith(2, and(isCategorization, categorizationHasCategory)),
  },
  {
    renderer: CategorizationStepperRenderer,
    tester: rankWith(
      3,
      and(isCategorization, categorizationHasCategory, optionIs('variant', 'stepper')),
    ),
  },
]
