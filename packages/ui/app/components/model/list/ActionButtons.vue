<template>
  <div class="flex gap-2">
    <button
      v-if="buttons && buttons.includes('select')"
      class="btn pointer-events-auto btn-square btn-ghost"
      @click.prevent.stop="() => emits('button', 'select')"
    >
      <Check class="size-[1.2em]" />
    </button>
    <button
      v-if="buttons && buttons.includes('edit')"
      class="btn pointer-events-auto btn-square btn-ghost"
      @click.prevent.stop="() => emits('button', 'edit')"
    >
      <Pencil class="size-[1.2em]" />
    </button>
    <button
      v-if="buttons && buttons.includes('delete')"
      class="btn pointer-events-auto btn-square btn-ghost"
      @click.prevent.stop="() => emits('button', 'delete')"
    >
      <Trash2 class="size-[1.2em]" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { Check, Pencil, Trash2 } from '@lucide/vue'

const { buttons } = defineProps<{
  buttons?: ('select' | 'edit' | 'delete')[]
}>()

const emits = defineEmits<{
  (e: 'button', btn: string): void
}>()
</script>
