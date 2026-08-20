<template>
  <form class="flex flex-col gap-4" @submit.prevent="onSubmit">
    <div class="flex flex-col gap-1">
      <label class="label">Type</label>
      <select v-model="form.type" class="select-bordered select w-full" required>
        <option v-for="t in sourceTypes" :key="t" :value="t">{{ t }}</option>
      </select>
    </div>
    <div class="flex flex-col gap-1">
      <label class="label">Content URL</label>
      <FormInput v-model="form.contentURL" placeholder="https://..." />
    </div>
    <div class="flex flex-col gap-1">
      <label class="label">Text</label>
      <FormTextArea
        v-model="form.text"
        placeholder="Plain-text content extracted from the source"
      />
    </div>
    <div class="flex flex-col gap-1">
      <label class="label">Metadata (JSON)</label>
      <FormTextArea v-model="form.metadataRaw" placeholder="{}" />
      <span v-if="metadataError" class="text-xs text-error">{{ metadataError }}</span>
    </div>
    <div class="flex justify-end gap-2">
      <Button type="submit">{{ sourceId ? 'Save' : 'Create' }}</Button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { graphql } from '~/gql'
import { SourceType } from '~/gql/graphql'

const props = defineProps<{
  sourceId?: string
  initialType?: SourceType
  initialContentURL?: string
  initialText?: string
  initialMetadata?: Record<string, unknown> | null
}>()

const emit = defineEmits<{
  (e: 'saved'): void
}>()

const sourceTypes = Object.values(SourceType)

const form = reactive({
  type: props.initialType ?? SourceType.Url,
  contentURL: props.initialContentURL ?? '',
  text: props.initialText ?? '',
  metadataRaw: props.initialMetadata ? JSON.stringify(props.initialMetadata, null, 2) : '',
})

const metadataError = ref('')

const createSourceMutation = graphql(`
  mutation CreateSourceFromForm($input: CreateSourceInput!) {
    createSource(input: $input) {
      source {
        id
      }
    }
  }
`)

const updateSourceMutation = graphql(`
  mutation UpdateSourceFromForm($input: UpdateSourceInput!) {
    updateSource(input: $input) {
      source {
        id
      }
    }
  }
`)

const { mutate: createSource } = useMutation(createSourceMutation)
const { mutate: updateSource } = useMutation(updateSourceMutation)

const parseJSON = (raw: string, errorRef: Ref<string>): Record<string, unknown> | null => {
  if (!raw.trim()) return null
  try {
    errorRef.value = ''
    return JSON.parse(raw)
  } catch {
    errorRef.value = 'Invalid JSON'
    return undefined as unknown as null
  }
}

const onSubmit = async () => {
  const metadata = parseJSON(form.metadataRaw, metadataError)
  if (metadataError.value) return

  if (props.sourceId) {
    await updateSource({
      input: {
        id: props.sourceId,
        type: form.type,
        contentURL: form.contentURL || null,
        text: form.text || null,
        metadata,
      },
    })
  } else {
    await createSource({
      input: {
        type: form.type,
        contentURL: form.contentURL || null,
        text: form.text || null,
        metadata,
      },
    })
  }
  emit('saved')
}
</script>
