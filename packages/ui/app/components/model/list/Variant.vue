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
      <UiImage class="size-10" :src="variant.imageURL"></UiImage>
    </div>
    <div class="min-w-0 flex-1">
      <div class="text-bold">{{ variant.name }}</div>
      <div class="text-xs opacity-70">
        {{ variant.desc }}
      </div>
      <div
        v-if="firstOrg || firstItem || variant.tags?.nodes?.length"
        class="mt-1 flex flex-wrap gap-1"
      >
        <span v-if="firstOrg" class="badge badge-sm badge-primary">{{ firstOrg }}</span>
        <span v-if="firstItem" class="badge badge-outline badge-sm">{{ firstItem }}</span>
        <span
          v-for="tag in variant.tags?.nodes"
          :key="tag.id"
          class="badge badge-outline badge-sm"
          >{{ tag.name }}</span
        >
      </div>
    </div>
    <ModelListActionButtons
      v-if="buttons && buttons.length"
      :id="variant.id"
      class="relative z-10"
      :buttons="buttons"
      @button="(btn: string) => emits('button', btn, variant.id)"
    />
  </li>
</template>

<script setup lang="ts">
import { graphql, useFragment, type FragmentType } from '~/gql'

const ListVariantFragment = graphql(`
  fragment ListVariantFragment on Variant {
    id
    name
    desc
    imageURL
    items(first: 1) {
      nodes {
        id
        name
      }
    }
    orgs(first: 1) {
      nodes {
        org {
          id
          name
        }
      }
    }
    tags(first: 3) {
      nodes {
        id
        name
      }
    }
  }
`)

const props = defineProps<{
  variant: FragmentType<typeof ListVariantFragment>
  buttons?: ('select' | 'edit' | 'delete')[]
  href?: string
  onRowClick?: () => void
}>()

const emits = defineEmits<{
  (e: 'button', btn: string, id: string): void
}>()

const variant = computed(() => useFragment(ListVariantFragment, props.variant))
const firstItem = computed(() => variant.value.items?.nodes?.[0]?.name ?? null)
const firstOrg = computed(() => variant.value.orgs?.nodes?.[0]?.org?.name ?? null)
</script>
