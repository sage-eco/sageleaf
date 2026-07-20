import { defineStore } from 'pinia'

export const useDetailPanelStore = defineStore('detail_panel', () => {
  const entityType = ref<string | null>(null)
  const entityId = ref<string | null>(null)
  const isOpen = computed(() => !!entityType.value && !!entityId.value)

  function openPanel(type: string, id: string) {
    entityType.value = type
    entityId.value = id
  }

  function closePanel() {
    entityType.value = null
    entityId.value = null
  }

  return { entityType, entityId, isOpen, openPanel, closePanel }
})
