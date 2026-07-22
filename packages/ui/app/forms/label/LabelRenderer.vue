<template>
  <label v-if="label.visible" :class="styles.label.root">
    {{ label.text }}
  </label>
</template>

<script lang="ts">
import type { LabelElement } from '@jsonforms/core'
import type { RendererProps } from '@jsonforms/vue'
import { rendererProps, useJsonFormsLabel } from '@jsonforms/vue'
import { defineComponent } from 'vue'

import { useVanillaLabel } from '../util'

export default defineComponent({
  name: 'LabelRenderer',
  props: {
    ...rendererProps<LabelElement>(),
  },
  setup(props: RendererProps<LabelElement>) {
    return useVanillaLabel(useJsonFormsLabel(props))
  },
})
</script>
