<template>
  <div class="flex flex-col justify-center">
    <div class="relative mb-10 w-full px-5">
      <div
        v-if="isLoading"
        class="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-base-100/60"
      >
        <LoaderCircle class="animate-spin text-base-content/40" :size="32" />
      </div>
      <FormChangeSaveStatus v-if="!readOnly" :status="saveStatus"></FormChangeSaveStatus>
      <FormJsonSchema
        v-if="jsonSchema && uiSchema"
        :schema="jsonSchema"
        :uischema="uiSchema"
        :data="updateData || createData"
        :readonly="readOnly"
        @change="onChange"
      />
      <Button
        v-if="(!autoSave || !changeId) && !hideSubmit"
        class="sticky bottom-0 btn-block"
        @click="saveForm"
        >Save</Button
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TypedDocumentNode } from '@graphql-typed-document-node/core'
import type { JsonFormsChangeEvent } from '@jsonforms/vue'
import { LoaderCircle } from '@lucide/vue'
import { useDebounceFn } from '@vueuse/core'

import { graphql } from '~/gql'
import { ChangeStatus, type Exact } from '~/gql/graphql'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SchemaQuery = any
const {
  changeId,
  modelId,
  schemaQuery,
  createMutation,
  updateMutation,
  createModelKey,
  autoSave,
  initialData,
} = defineProps<{
  changeId: string | undefined
  modelId: string
  schemaQuery: TypedDocumentNode<
    SchemaQuery,
    Exact<{
      [key: string]: never
    }>
  >
  createMutation: TypedDocumentNode<
    { [key: string]: unknown },
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input: any
    }
  >
  updateMutation: TypedDocumentNode<
    { [key: string]: unknown },
    Exact<{
      input: {
        id: string
        [key: string]: unknown
      }
    }>
  >
  createModelKey: string
  autoSave?: boolean
  initialData?: Record<string, unknown>
  hideSubmit?: boolean
}>()

const emits = defineEmits<{
  (e: 'created' | 'saved', id: string): void
}>()

const { result: schemaData } = useQuery(schemaQuery)
const jsonSchema = computed(() => {
  if (modelId === 'new' && schemaData.value) {
    const schemaKey = Object.keys(schemaData.value)[0]!
    return schemaData.value[schemaKey]?.create?.schema
  } else if (modelId !== 'new' && schemaData.value) {
    const schemaKey = Object.keys(schemaData.value)[0]!
    return schemaData.value[schemaKey]?.update?.schema
  }
  return null
})
const uiSchema = computed(() => {
  if (modelId === 'new' && schemaData.value) {
    const schemaKey = Object.keys(schemaData.value)[0]!
    return schemaData.value[schemaKey]?.create?.uischema
  } else if (modelId !== 'new' && schemaData.value) {
    const schemaKey = Object.keys(schemaData.value)[0]!
    return schemaData.value[schemaKey]?.update?.uischema
  }
  return null
})

const createData = ref<object>({})

const { register, push, unregister, onExternalUpdate } = useScribeleaf()
let applyingExternalUpdate = false
const pushToScribeleaf = useDebounceFn((data: object) => {
  if (applyingExternalUpdate) return
  push(data)
}, 500)

if (modelId === 'new' && initialData) {
  createData.value = sanitizeFormData(initialData)
}
const editQuery = graphql(`
  query ChangesGetEdit($id: ID!, $changeID: ID!) {
    change(id: $changeID) {
      status
      edits(id: $id) {
        nodes {
          updateInput
        }
      }
    }
  }
`)
const directEditQuery = graphql(`
  query DirectGetEdit($id: ID!, $entityName: String!) {
    directEdit(id: $id, entityName: $entityName) {
      entityName
      id
      updateInput
    }
  }
`)
const { entityName, updateData, changeStatus } = useModelEditData(
  modelId,
  changeId,
  createModelKey,
  jsonSchema,
  editQuery,
  directEditQuery,
)

const readOnly = computed<boolean | undefined>(() => {
  if (changeStatus.value !== ChangeStatus.Merged) {
    return
  }
  return true
})

const isLoading = computed(() => {
  if (modelId === 'new') return !jsonSchema.value || !uiSchema.value
  return updateData.value === null
})

const { saveStatus, saveForm } = useModelFormSave(
  modelId,
  changeId,
  createModelKey,
  autoSave,
  createMutation,
  updateMutation,
  createData,
  updateData,
  emits,
)

let firstChange = false
const onChange = (event: JsonFormsChangeEvent) => {
  if (changeStatus.value === ChangeStatus.Merged) {
    return
  }
  if (event.data) {
    if (event.errors && event.errors.length > 0) {
      saveStatus.value = 'error'
      return
    }
    if (firstChange) {
      saveStatus.value = 'not_saved'
    }
    if (!firstChange) {
      firstChange = true
    }
    if (modelId === 'new') {
      createData.value = event.data
    } else {
      updateData.value = event.data
    }
    pushToScribeleaf(event.data)
  }
}
watch(
  [jsonSchema, uiSchema, createData, updateData],
  ([schema, uischema, create, update]) => {
    if (!schema || !uischema) return
    const data = modelId === 'new' ? create : update
    if (!data) return
    register(schema, uischema, data, { modelId, entityName, changeId })
  },
  { immediate: true },
)

let unlistenExternalUpdate: (() => void) | undefined
onMounted(async () => {
  const unlisten = await onExternalUpdate((data) => {
    applyingExternalUpdate = true
    if (modelId === 'new') {
      createData.value = data
    } else {
      updateData.value = data
    }
    applyingExternalUpdate = false
  })
  unlistenExternalUpdate = unlisten
})
onUnmounted(() => {
  unlistenExternalUpdate?.()
  unregister()
})

defineExpose({ submit: saveForm })
</script>
