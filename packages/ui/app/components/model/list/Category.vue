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
      <UiImage class="size-10" :src="category.imageURL"></UiImage>
    </div>
    <div class="min-w-0 flex-1">
      <div class="text-bold">{{ category.name_req }}</div>
      <div class="text-xs opacity-70">
        {{ category.descShort }}
      </div>
    </div>
    <ModelListActionButtons
      v-if="buttons && buttons.length"
      :id="category.id"
      class="relative z-10"
      :buttons="buttons"
      @button="(btn: string) => emits('button', btn, category.id)"
    />
  </li>
</template>

<script setup lang="ts">
import { graphql, useFragment, type FragmentType } from '~/gql'

const ListCategoryFragment = graphql(`
  fragment ListCategoryFragment on Category {
    id
    name_req: name
    descShort
    imageURL
  }
`)

const props = defineProps<{
  category: FragmentType<typeof ListCategoryFragment>
  buttons?: ('select' | 'edit' | 'delete')[]
  href?: string
  onRowClick?: () => void
}>()

const emits = defineEmits<{
  (e: 'button', btn: string, id: string): void
}>()

const category = computed(() => useFragment(ListCategoryFragment, props.category))
</script>
