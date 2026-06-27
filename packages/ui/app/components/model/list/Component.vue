<template>
  <li
    class="list-row relative flex items-center gap-4 rounded-lg px-4 py-3 transition-colors"
    :class="{ 'cursor-pointer hover:bg-base-200': !!href || !!onRowClick }"
  >
    <NuxtLink v-if="href" :to="href" class="absolute inset-0" />
    <button v-else-if="onRowClick" class="absolute inset-0" @click="onRowClick" />
    <slot name="leading" />
    <div class="shrink-0">
      <UiImage class="size-10" :src="component.imageURL"></UiImage>
    </div>
    <div class="min-w-0 flex-1">
      <div class="text-bold">{{ component.name }}</div>
      <div class="text-xs opacity-70">
        {{ component.desc }}
      </div>
      <div
        v-if="component.primaryMaterial?.name || component.materials?.length"
        class="mt-1 flex flex-wrap gap-1"
      >
        <span v-if="component.primaryMaterial?.name" class="badge badge-sm badge-primary">{{
          component.primaryMaterial.name
        }}</span>
        <span
          v-for="cm in component.materials"
          :key="cm.material.id"
          class="badge badge-outline badge-sm"
          >{{ cm.material.name }}</span
        >
      </div>
    </div>
    <ModelListActionButtons
      v-if="buttons && buttons.length"
      :id="component.id"
      class="relative z-10"
      :buttons="buttons"
      @button="(btn: string) => emits('button', btn, component.id)"
    />
  </li>
</template>

<script setup lang="ts">
import { graphql, useFragment, type FragmentType } from '~/gql'

const ListComponentFragment = graphql(`
  fragment ListComponentFragment on Component {
    id
    name
    desc
    imageURL
    primaryMaterial {
      id
      name
    }
    materials {
      material {
        id
        name
      }
    }
  }
`)

const props = defineProps<{
  component: FragmentType<typeof ListComponentFragment>
  buttons?: ('select' | 'edit' | 'delete')[]
  href?: string
  onRowClick?: () => void
}>()

const emits = defineEmits<{
  (e: 'button', btn: string, id: string): void
}>()

const component = computed(() => useFragment(ListComponentFragment, props.component))
</script>
