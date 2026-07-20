<template>
  <li
    class="list-row relative flex items-center gap-4 rounded-lg px-4 py-3 transition-colors"
    :class="{ 'cursor-pointer hover:bg-base-200': !!onRowClick }"
  >
    <button v-if="onRowClick" class="absolute inset-0" @click="onRowClick" />
    <div v-if="$slots.leading" class="relative z-10">
      <slot name="leading" />
    </div>
    <div class="shrink-0">
      <UiImage class="size-10" :src="'icon://lets-icons:materials'"></UiImage>
    </div>
    <div class="min-w-0 flex-1">
      <div class="text-bold">{{ material.name }}</div>
      <div class="text-xs opacity-70">
        {{ material.desc }}
      </div>
      <div v-if="hasBadges" class="mt-1 flex flex-wrap gap-1">
        <span v-if="material.shape" class="badge badge-outline badge-sm">{{ material.shape }}</span>
        <span v-if="material.technical" class="badge badge-sm badge-warning">Technical</span>
      </div>
      <div v-if="material.synonyms?.length" class="mt-1 text-xs opacity-50">
        {{ material.synonyms.slice(0, 2).join(', ') }}
      </div>
    </div>
    <ModelListActionButtons
      v-if="buttons && buttons.length"
      :id="material.id"
      :buttons="buttons"
      @button="(btn: string) => emits('button', btn, material.id)"
    />
  </li>
</template>

<script setup lang="ts">
import { graphql, useFragment, type FragmentType } from '~/gql'

const ListMaterialFragment = graphql(`
  fragment ListMaterialFragment on Material {
    id
    name
    desc
    shape
    technical
    synonyms
  }
`)

const props = defineProps<{
  material: FragmentType<typeof ListMaterialFragment>
  buttons?: ('select' | 'edit' | 'delete')[]
  onRowClick?: () => void
}>()

const emits = defineEmits<{
  (e: 'button', btn: string, id: string): void
}>()

const material = computed(() => useFragment(ListMaterialFragment, props.material))
const hasBadges = computed(() => !!material.value.shape || material.value.technical)
</script>
