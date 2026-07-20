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
      <div class="text-bold">{{ place.name }}</div>
      <div class="text-xs opacity-70">
        {{ place.desc }}
      </div>
      <div v-if="locationText || place.org?.name" class="mt-1 flex flex-wrap items-center gap-2">
        <span v-if="locationText" class="text-xs opacity-50">{{ locationText }}</span>
        <span v-if="place.org?.name" class="badge badge-outline badge-sm">{{
          place.org.name
        }}</span>
      </div>
    </div>
    <ModelListActionButtons
      v-if="buttons && buttons.length"
      :id="place.id"
      class="relative z-10"
      :buttons="buttons"
      @button="(btn: string) => emits('button', btn, place.id)"
    />
  </li>
</template>

<script setup lang="ts">
import { graphql, useFragment, type FragmentType } from '~/gql'

const ListPlaceFragment = graphql(`
  fragment ListPlaceFragment on Place {
    id
    name
    desc
    address {
      city
      country
    }
    org {
      id
      name
    }
  }
`)

const props = defineProps<{
  place: FragmentType<typeof ListPlaceFragment>
  buttons?: ('select' | 'edit' | 'delete')[]
  href?: string
  onRowClick?: () => void
}>()

const emits = defineEmits<{
  (e: 'button', btn: string, id: string): void
}>()

const place = computed(() => useFragment(ListPlaceFragment, props.place))
const locationText = computed(() => {
  const { city, country } = place.value.address ?? {}
  return [city, country].filter(Boolean).join(', ') || null
})
</script>
