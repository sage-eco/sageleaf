<template>
  <fieldset v-if="layout.visible" :class="styles.group.root">
    <legend v-if="layout.label" :class="styles.group.label">
      {{ layout.label }}
    </legend>
    <div
      v-for="(element, index) in layout.uischema.elements"
      :key="`${layout.path}-${index}`"
      :class="styles.group.item"
    >
      <dispatch-renderer
        :schema="layout.schema"
        :uischema="element"
        :path="layout.path"
        :enabled="layout.enabled"
        :renderers="layout.renderers"
        :cells="layout.cells"
      />
    </div>
  </fieldset>
</template>

<script lang="ts">
import type { Layout } from '@jsonforms/core'
import type { RendererProps } from '@jsonforms/vue'
import { DispatchRenderer, rendererProps, useJsonFormsLayout } from '@jsonforms/vue'
import { defineComponent } from 'vue'

import { useVanillaLayout } from '../util'

export default defineComponent({
  name: 'GroupRenderer',
  components: {
    DispatchRenderer,
  },
  props: {
    ...rendererProps<Layout>(),
  },
  setup(props: RendererProps<Layout>) {
    return useVanillaLayout(useJsonFormsLayout(props))
  },
})
</script>
