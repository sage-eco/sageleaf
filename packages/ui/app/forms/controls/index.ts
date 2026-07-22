import type { JsonFormsRendererRegistryEntry } from '@jsonforms/core'
import {
  and,
  formatIs,
  isBooleanControl,
  isDateControl,
  isDateTimeControl,
  isEnumControl,
  isIntegerControl,
  isMultiLineControl,
  isNumberControl,
  isOneOfEnumControl,
  isStringControl,
  isTimeControl,
  optionIs,
  or,
  rankWith,
  uiTypeIs,
} from '@jsonforms/core'

import BooleanControlRenderer from './BooleanControlRenderer.vue'
import DateControlRenderer from './DateControlRenderer.vue'
import DateTimeControlRenderer from './DateTimeControlRenderer.vue'
import EnumControlRenderer from './EnumControlRenderer.vue'
import EnumOneOfControlRenderer from './EnumOneOfControlRenderer.vue'
import ImageControlRenderer from './ImageControlRenderer.vue'
import IntegerControlRenderer from './IntegerControlRenderer.vue'
import MultiStringControlRenderer from './MultiStringControlRenderer.vue'
import NumberControlRenderer from './NumberControlRenderer.vue'
import StringControlRenderer from './StringControlRenderer.vue'
import TimeControlRenderer from './TimeControlRenderer.vue'

export { default as ControlWrapper } from './ControlWrapper.vue'
export {
  StringControlRenderer,
  MultiStringControlRenderer,
  NumberControlRenderer,
  IntegerControlRenderer,
  EnumControlRenderer,
  EnumOneOfControlRenderer as oneOfEnumControlRenderer,
  DateControlRenderer,
  DateTimeControlRenderer,
  TimeControlRenderer,
  BooleanControlRenderer,
  ImageControlRenderer,
}

export const controlRenderers: JsonFormsRendererRegistryEntry[] = [
  { renderer: StringControlRenderer, tester: rankWith(1, isStringControl) },
  {
    renderer: MultiStringControlRenderer,
    tester: rankWith(2, and(isStringControl, isMultiLineControl)),
  },
  { renderer: NumberControlRenderer, tester: rankWith(1, isNumberControl) },
  { renderer: IntegerControlRenderer, tester: rankWith(1, isIntegerControl) },
  { renderer: EnumControlRenderer, tester: rankWith(2, isEnumControl) },
  { renderer: EnumOneOfControlRenderer, tester: rankWith(5, isOneOfEnumControl) },
  { renderer: DateControlRenderer, tester: rankWith(2, isDateControl) },
  { renderer: DateTimeControlRenderer, tester: rankWith(2, isDateTimeControl) },
  { renderer: TimeControlRenderer, tester: rankWith(2, isTimeControl) },
  { renderer: BooleanControlRenderer, tester: rankWith(1, isBooleanControl) },
  {
    renderer: ImageControlRenderer,
    tester: rankWith(2, and(uiTypeIs('Control'), or(formatIs('uri'), optionIs('format', 'uri')))),
  },
]
