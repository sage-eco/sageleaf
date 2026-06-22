<script setup lang="ts">
import { ChevronDownIcon, SlidersHorizontalIcon } from '@lucide/vue'
import { T } from '@tolgee/vue'

const isOpen = defineModel<boolean>('open', { default: false })
const count = defineModel<number>('count', { default: 0 })
</script>

<template>
  <button
    type="button"
    :class="[
      'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors',
      count > 0
        ? 'border-secondary bg-secondary/10 text-secondary'
        : 'border-transparent bg-base-200 text-base-content/70 hover:bg-base-300',
    ]"
    :aria-pressed="count > 0"
    @click="isOpen = true"
  >
    <SlidersHorizontalIcon :size="14" />
    <span>
      <T v-if="count === 0" ns="frontend" key-name="search.filter.pill.label" />
      <T v-else-if="count === 1" ns="frontend" key-name="search.filter.pill.single" />
      <T v-else ns="frontend" key-name="search.filter.pill.multiple" :params="{ count }" />
    </span>
    <ChevronDownIcon :size="14" />
  </button>
</template>
