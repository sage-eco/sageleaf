<template>
  <control-wrapper
    v-bind="controlWrapper"
    :styles="styles"
    :is-focused="isFocused"
    :applied-options="appliedOptions"
  >
    <FormInput
      :id="control.id + '-input'"
      type="datetime-local"
      :class="styles.control.input"
      :model-value="dataTime"
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
import type { ControlElement } from '@jsonforms/core'
import type { RendererProps } from '@jsonforms/vue'
import { rendererProps, useJsonFormsControl } from '@jsonforms/vue'
import { defineComponent } from 'vue'

import { useVanillaControl } from '../util'
// eslint-disable-next-line import/no-named-default
import { default as ControlWrapper } from './ControlWrapper.vue'

const toISOString = (inputDateTime: string) => {
  return inputDateTime === '' ? undefined : inputDateTime + ':00.000Z'
}

export default defineComponent({
  name: 'DatetimeControlRenderer',
  components: {
    ControlWrapper,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    return useVanillaControl(useJsonFormsControl(props), (target) => toISOString(target.value))
  },
  computed: {
    dataTime(): string {
      return (this.control.data ?? '').slice(0, 16)
    },
  },
})
</script>
