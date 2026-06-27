<template>
  <li
    class="list-row relative flex items-center gap-4 rounded-lg px-4 py-3 transition-colors"
    :class="{ 'cursor-pointer hover:bg-base-200': !!onRowClick }"
  >
    <button v-if="onRowClick" class="absolute inset-0" @click="onRowClick" />
    <slot name="leading" />
    <div class="shrink-0">
      <UiImage class="size-10" :src="'icon://lets-icons:materials'"></UiImage>
    </div>
    <div class="min-w-0 flex-1">
      <div class="text-bold">{{ material.name }}</div>
      <div class="text-xs opacity-70">
        {{ material.desc }}
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
</script>
