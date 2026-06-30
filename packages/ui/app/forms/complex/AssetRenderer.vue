<template>
  <control-wrapper
    v-bind="controlWrapper"
    :styles="styles"
    :is-focused="isFocused"
    :applied-options="appliedOptions"
  >
    <FormInput
      :id="control.id + '-input'"
      :class="styles.control.input"
      :model-value="control.data"
      :disabled="!control.enabled"
      :autofocus="appliedOptions.focus"
      :placeholder="appliedOptions.placeholder"
      @change="onChange"
      @focus="isFocused = true"
      @blur="isFocused = false"
    />
  </control-wrapper>
</template>

<script lang="ts">
import type { ControlElement, JsonFormsRendererRegistryEntry } from '@jsonforms/core'
import { rankWith, and, uiTypeIs, schemaTypeIs, optionIs } from '@jsonforms/core'
import type { RendererProps } from '@jsonforms/vue'
import { rendererProps, useJsonFormsControl } from '@jsonforms/vue'
import { defineComponent } from 'vue'

import { ControlWrapper } from '../controls'
import { useVanillaControl } from '../util'

const controlRenderer = defineComponent({
  name: 'AssetRenderer',
  components: {
    ControlWrapper,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    return useVanillaControl(useJsonFormsControl(props), (target) => target.value || undefined)
  },
})

export default controlRenderer

export const entry: JsonFormsRendererRegistryEntry = {
  renderer: controlRenderer,
  tester: rankWith(
    2,
    and(uiTypeIs('Control'), optionIs('control', 'Asset'), schemaTypeIs('string')),
  ),
}
</script>
