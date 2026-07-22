<template>
  <div v-for="(checkElement, index) in control.options" :key="index">
    <input
      :id="control.id + `-input-${index}`"
      type="checkbox"
      :class="styles.control.input"
      :value="checkElement.value"
      :checked="dataHasEnum(checkElement.value)"
      :disabled="!control.enabled"
      :placeholder="appliedOptions?.placeholder"
      @change="(event) => toggle(checkElement.value, (event.target as HTMLInputElement)?.checked)"
    />
    <label :for="control.id + `-input-${index}`">
      {{ checkElement.label }}
    </label>
  </div>
</template>

<script lang="ts">
import type { ControlElement } from '@jsonforms/core'
import type { RendererProps } from '@jsonforms/vue'
import { rendererProps, useJsonFormsMultiEnumControl } from '@jsonforms/vue'
import { defineComponent } from 'vue'

import { useVanillaArrayControl } from '../util'

export default defineComponent({
  name: 'EnumArrayRenderer',
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    const control = useJsonFormsMultiEnumControl(props)

    return useVanillaArrayControl(control)
  },
  methods: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dataHasEnum(value: any): boolean {
      return !!this.control.data?.includes(value)
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toggle(value: any, checked: boolean): void {
      if (checked) {
        this.addItem(this.control.path, value)
      } else {
        this.removeItem?.(this.control.path, value)
      }
    },
  },
})
</script>
