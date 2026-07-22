<template>
  <div v-if="layout.visible" :class="layoutClassObject.root">
    <div
      v-for="(element, index) in layout.uischema.elements"
      :key="`${layout.path}-${index}`"
      :class="layoutClassObject.item"
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
  </div>
</template>

<script lang="ts">
import type { Layout } from '@jsonforms/core'
import type { RendererProps } from '@jsonforms/vue'
import { DispatchRenderer, rendererProps, useJsonFormsLayout } from '@jsonforms/vue'
import { defineComponent } from 'vue'

import { useVanillaLayout } from '../util'

export default defineComponent({
  name: 'LayoutRenderer',
  components: {
    DispatchRenderer,
  },
  props: {
    ...rendererProps<Layout>(),
  },
  setup(props: RendererProps<Layout>) {
    return useVanillaLayout(useJsonFormsLayout(props))
  },
  computed: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    layoutClassObject(): any {
      return this.layout.direction === 'row'
        ? this.styles.horizontalLayout
        : this.styles.verticalLayout
    },
  },
})
</script>
