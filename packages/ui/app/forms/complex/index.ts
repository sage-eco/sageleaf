import { entry as enumArrayRendererEntry } from './EnumArrayRenderer.vue'
import { entry as objectRendererEntry } from './ObjectRenderer.vue'
import { entry as oneOfRendererEntry } from './OneOfRenderer.vue'
import { entry as referenceRendererEntry } from './ReferenceRenderer.vue'
import { entry as translatedFieldRendererEntry } from './TranslatedFieldRenderer.vue'

export { default as ObjectRenderer } from './ObjectRenderer.vue'
export { default as OneOfRenderer } from './OneOfRenderer.vue'
export { default as EnumArrayRenderer } from './EnumArrayRenderer.vue'
export { default as ReferenceRenderer } from './ReferenceRenderer.vue'
export { default as TranslatedFieldRenderer } from './TranslatedFieldRenderer.vue'

export const complexRenderers = [
  objectRendererEntry,
  oneOfRendererEntry,
  enumArrayRendererEntry,
  referenceRendererEntry,
  translatedFieldRendererEntry,
]
