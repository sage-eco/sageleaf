<template>
  <Dialog v-model:open="open">
    <DialogContent>
      <DialogTitle>Delete Change</DialogTitle>
      <p>
        Are you sure you want to delete <strong>{{ title }}</strong
        >?
      </p>
      <DialogFooter>
        <Button variant="outline" @click="open = false">Cancel</Button>
        <Button variant="destructive" :disabled="deleting" @click="onDelete">
          <span v-if="deleting" class="loading loading-sm loading-spinner" />
          Delete
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
defineProps<{ title?: string }>()

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ confirm: [] }>()

const deleting = ref(false)

const onDelete = () => {
  deleting.value = true
  try {
    emit('confirm')
    open.value = false
  } finally {
    deleting.value = false
  }
}
</script>
