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
      <UiImage class="size-10" :src="component.imageURL"></UiImage>
    </div>
    <div class="min-w-0 flex-1">
      <div class="text-bold">{{ component.name }}</div>
      <div class="text-xs opacity-70">
        {{ component.desc }}
      </div>
      <div v-if="hasBadges" class="mt-1 flex flex-wrap gap-1">
        <span v-if="component.primaryMaterial?.name" class="badge badge-sm badge-primary">{{
          component.primaryMaterial.name
        }}</span>
        <span
          v-for="cm in component.materials"
          :key="cm.material.id"
          class="badge badge-outline badge-sm"
          >{{ cm.material.name }}</span
        >
        <span
          v-for="tag in component.tags?.nodes"
          :key="tag.id"
          class="badge badge-outline badge-sm"
          >{{ tag.name }}</span
        >
        <span v-if="component.region?.name" class="badge badge-outline badge-sm">{{
          component.region.name
        }}</span>
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
    tags(first: 3) {
      nodes {
        id
        name
      }
    }
    region {
      id
      name
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
const hasBadges = computed(
  () =>
    !!component.value.primaryMaterial?.name ||
    !!component.value.materials?.length ||
    !!component.value.tags?.nodes?.length ||
    !!component.value.region?.name,
)
</script>
