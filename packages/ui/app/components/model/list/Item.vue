<template>
  <li
    class="list-row relative flex items-center gap-4 rounded-lg px-4 py-3 transition-colors"
    :class="{ 'cursor-pointer hover:bg-base-200': !!href || !!onRowClick }"
  >
    <NuxtLink v-if="href" :to="href" class="absolute inset-0" />
    <button v-else-if="onRowClick" class="absolute inset-0" @click="onRowClick" />
    <div v-if="$slots.leading" class="relative z-10">
      <slot name="leading" />
    </div>
    <div class="shrink-0">
      <UiImage class="size-10" :src="item.imageURL"></UiImage>
    </div>
    <div class="min-w-0 flex-1">
      <div class="text-bold">{{ item.name }}</div>
      <div class="text-xs opacity-70">
        {{ item.desc }}
      </div>
    </div>
    <ModelListActionButtons
      v-if="buttons && buttons.length"
      :id="item.id"
      class="relative z-10"
      :buttons="buttons"
      @button="(btn: string) => emits('button', btn, item.id)"
    />
  </li>
</template>

<script setup lang="ts">
import { graphql, useFragment, type FragmentType } from '~/gql'

const ListItemFragment = graphql(`
  fragment ListItemFragment on Item {
    id
    name
    desc
    imageURL
  }
`)

const props = defineProps<{
  item: FragmentType<typeof ListItemFragment>
  buttons?: ('select' | 'edit' | 'delete')[]
  href?: string
  onRowClick?: () => void
}>()

const emits = defineEmits<{
  (e: 'button', btn: string, id: string): void
}>()

const item = computed(() => useFragment(ListItemFragment, props.item))
</script>
