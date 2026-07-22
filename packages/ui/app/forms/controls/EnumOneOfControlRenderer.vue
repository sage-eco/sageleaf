<template>
  <control-wrapper
    v-bind="controlWrapper"
    :styles="styles"
    :is-focused="isFocused"
    :applied-options="appliedOptions"
  >
    <Select
      :id="control.id + '-input'"
      :class="styles.control.select"
      :model-value="control.data"
      :disabled="!control.enabled"
      :autofocus="appliedOptions.focus"
      @update:model-value="(value: any) => onChange({ target: { value } } as unknown as Event)"
      @focus="isFocused = true"
      @blur="isFocused = false"
    >
      <SelectTrigger>
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem
            v-for="optionElement in control.options"
            :key="optionElement.value"
            :value="optionElement.value"
            :label="
              optionElement.label ||
              control.schema.oneOf?.find((o) => o.const === optionElement.value)?.title
            "
            :class="styles.control.option"
          ></SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  </control-wrapper>
</template>

<script lang="ts">
import type { ControlElement } from '@jsonforms/core'
import type { RendererProps } from '@jsonforms/vue'
import { rendererProps, useJsonFormsOneOfEnumControl } from '@jsonforms/vue'
import { defineComponent } from 'vue'

import { useVanillaControl } from '../util'
// eslint-disable-next-line import/no-named-default
import { default as ControlWrapper } from './ControlWrapper.vue'

export default defineComponent({
  name: 'EnumOneofControlRenderer',
  components: {
    ControlWrapper,
  },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    return useVanillaControl(useJsonFormsOneOfEnumControl(props), (target) =>
      target.selectedIndex === 0 ? undefined : target.value,
    )
  },
})
</script>
