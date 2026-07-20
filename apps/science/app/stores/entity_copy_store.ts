import { defineStore } from 'pinia'

export const useEntityCopyStore = defineStore('entity_copy', () => {
  const copyData = ref<Record<string, unknown> | undefined>(undefined)

  function setCopyData(data: Record<string, unknown>) {
    copyData.value = data
  }

  function consumeCopyData(): Record<string, unknown> | undefined {
    const data = copyData.value
    copyData.value = undefined
    return data
  }

  return { setCopyData, consumeCopyData }
})
