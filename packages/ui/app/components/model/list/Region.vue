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
    <div class="min-w-0 flex-1">
      <div class="text-bold">{{ region.name }}</div>
      <div v-if="region.desc" class="text-xs opacity-70">{{ region.desc }}</div>
      <div v-if="region.placetype || breadcrumb" class="mt-1 flex flex-wrap items-center gap-2">
        <span v-if="region.placetype" class="badge badge-outline badge-sm">{{
          region.placetype
        }}</span>
        <span v-if="breadcrumb" class="text-xs opacity-50">{{ breadcrumb }}</span>
      </div>
    </div>
    <ModelListActionButtons
      v-if="buttons && buttons.length"
      :id="region.id"
      :buttons="buttons"
      @button="(btn: string) => emits('button', btn, region.id)"
    />
  </li>
</template>

<script setup lang="ts">
import { graphql, useFragment, type FragmentType } from '~/gql'

const ListRegionFragment = graphql(`
  fragment ListRegionFragment on Region {
    id
    name
    desc
    placetype
    province {
      id
      name
    }
    country {
      id
      name
    }
  }
`)

const props = defineProps<{
  region: FragmentType<typeof ListRegionFragment>
  buttons?: ('select' | 'edit' | 'delete')[]
  href?: string
  onRowClick?: () => void
}>()

const emits = defineEmits<{
  (e: 'button', btn: string, id: string): void
}>()

const region = computed(() => useFragment(ListRegionFragment, props.region))
const breadcrumb = computed(
  () =>
    [region.value.province?.name, region.value.country?.name].filter(Boolean).join(', ') || null,
)
</script>
