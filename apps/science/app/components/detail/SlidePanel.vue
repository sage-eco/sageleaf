<template>
  <Sheet
    :open="panelStore.isOpen"
    :modal="false"
    @update:open="(v) => !v && panelStore.closePanel()"
  >
    <SheetContent
      :overlay="false"
      :hide-close="true"
      class="w-[680px] overflow-y-auto p-0 sm:max-w-[680px]"
      @interact-outside="(e) => e.preventDefault()"
    >
      <component
        :is="detailComponent"
        v-if="panelStore.entityId && detailComponent"
        :id="panelStore.entityId"
        mode="panel"
        @close="panelStore.closePanel()"
      />
    </SheetContent>
  </Sheet>
</template>

<script setup lang="ts">
import { defineAsyncComponent } from 'vue'

import { useDetailPanelStore } from '~/stores/detail_panel_store'

const panelStore = useDetailPanelStore()

const detailComponents: Record<string, ReturnType<typeof defineAsyncComponent>> = {
  category: defineAsyncComponent(() => import('~/components/category/CategoryDetail.vue')),
  item: defineAsyncComponent(() => import('~/components/item/ItemDetail.vue')),
  variant: defineAsyncComponent(() => import('~/components/variant/VariantDetail.vue')),
  component: defineAsyncComponent(() => import('~/components/component/ComponentDetail.vue')),
  material: defineAsyncComponent(() => import('~/components/material/MaterialDetail.vue')),
  process: defineAsyncComponent(() => import('~/components/process/ProcessDetail.vue')),
  org: defineAsyncComponent(() => import('~/components/org/OrgDetail.vue')),
  place: defineAsyncComponent(() => import('~/components/place/PlaceDetail.vue')),
  program: defineAsyncComponent(() => import('~/components/program/ProgramDetail.vue')),
  source: defineAsyncComponent(() => import('~/components/source/SourceDetail.vue')),
  change: defineAsyncComponent(() => import('~/components/change/ChangeDetail.vue')),
}

const detailComponent = computed(() =>
  panelStore.entityType ? detailComponents[panelStore.entityType] : null,
)
</script>
