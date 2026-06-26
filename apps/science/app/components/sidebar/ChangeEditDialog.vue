<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[80vh] overflow-auto">
      <DialogTitle>Edit Change</DialogTitle>
      <form class="flex flex-col gap-4" @submit.prevent="onSave">
        <div class="flex flex-col gap-1">
          <label class="label">Title</label>
          <FormInput v-model="form.title" placeholder="Title" />
        </div>
        <div class="flex flex-col gap-1">
          <label class="label">Description</label>
          <FormTextArea v-model="form.description" placeholder="Description" />
        </div>
        <DialogFooter>
          <Button variant="outline" type="button" @click="open = false">Cancel</Button>
          <Button type="submit" :disabled="saving">Save</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
const props = defineProps<{
  initialTitle?: string
  initialDescription?: string
}>()

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ save: [{ title: string; description: string }] }>()

const saving = ref(false)
const form = reactive({
  title: props.initialTitle ?? '',
  description: props.initialDescription ?? '',
})

watch(
  () => open.value,
  (isOpen) => {
    if (isOpen) {
      form.title = props.initialTitle ?? ''
      form.description = props.initialDescription ?? ''
      saving.value = false
    }
  },
)

const onSave = () => {
  saving.value = true
  try {
    emit('save', { title: form.title, description: form.description })
    open.value = false
  } finally {
    saving.value = false
  }
}
</script>
