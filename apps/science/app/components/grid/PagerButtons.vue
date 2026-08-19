<template>
  <div class="flex gap-2">
    <Button variant="outline" size="sm" :disabled="!hasPreviousPage" @click="emit('prev')">
      <ChevronLeft class="size-4" />
      Prev
    </Button>
    <Button variant="outline" size="sm" :disabled="!hasNextPage" @click="emit('next')">
      Next
      <ChevronRight class="size-4" />
    </Button>
  </div>
</template>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'

defineProps<{
  hasPreviousPage: boolean
  hasNextPage: boolean
}>()

const emit = defineEmits<{
  prev: []
  next: []
}>()
</script>
