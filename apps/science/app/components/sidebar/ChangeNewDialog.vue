<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[80vh] max-w-lg overflow-auto">
      <DialogHeader>
        <DialogTitle>New Change</DialogTitle>
      </DialogHeader>
      <FormChangeNew @created="onCreated" />
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ created: [id?: string] }>()

const onCreated = (id?: string) => {
  emit('created', id)
  open.value = false
}
</script>
