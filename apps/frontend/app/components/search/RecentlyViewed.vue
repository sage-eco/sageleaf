<template>
  <template v-if="displayItems.length > 0">
    <li class="px-4 py-2 text-xs tracking-wide opacity-60">Recently viewed</li>
    <li v-for="res in displayItems" :key="res.id">
      <NuxtLink :to="exploreLink(res.__typename, res.id)">
        <div class="list-row flex items-center gap-2 pt-2 pb-3">
          <UiImage
            v-if="res.imageURL"
            :src="res.imageURL"
            :width="20"
            :height="20"
            class="size-20 rounded-box"
          />
          <span
            v-else
            class="flex size-20 items-center justify-center rounded-box border border-neutral-200"
          >
            <component :is="placeholderIcon(res.__typename)" class="size-8" />
          </span>
          <div class="flex-1 px-2">
            <Badge :variant="typeBadgeVariant(res.__typename)" class="mb-1">
              {{ formatType(res.__typename) }}
            </Badge>
            <div class="text-bold">{{ res.name }}</div>
            <div class="text-xs opacity-70">{{ res.desc }}</div>
          </div>
          <button class="btn btn-square btn-ghost">
            <ChevronRightIcon class="size-5" />
          </button>
        </div>
      </NuxtLink>
    </li>
  </template>
  <li v-else class="flex h-full flex-col items-center justify-center py-8">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="size-24 p-6 dark:text-zinc-700"
    >
      <filter id="inset-shadow">
        <feOffset dx="0" dy="0" />
        <feGaussianBlur stdDeviation="1" result="offset-blur" />
        <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
        <feFlood flood-color="black" flood-opacity=".95" result="color" />
        <feComposite operator="in" in="color" in2="inverse" result="shadow" />
        <feComposite operator="over" in="shadow" in2="SourceGraphic" />
      </filter>
      <path d="m21 21-4.34-4.34" />
      <circle cx="11" cy="11" r="8" />
    </svg>
    <h2 class="text-xl text-zinc-600">Search for anything</h2>
  </li>
</template>

<script setup lang="ts">
import {
  BoxIcon,
  Building2Icon,
  ChevronRightIcon,
  CircleHelpIcon,
  MapPinIcon,
  PackageIcon,
  TagsIcon,
} from '@lucide/vue'
import { useApolloClient } from '@vue/apollo-composable'
import { parse } from 'graphql'
import type { Component } from 'vue'

type DisplayItem = {
  id: string
  __typename: string
  name?: string
  imageURL?: string
  desc?: string
}

const TYPE_RESOLVER: Record<string, string> = {
  Category: 'category',
  Item: 'item',
  Variant: 'variant',
  Org: 'org',
  Place: 'place',
}

// Fields to fetch per type. Org uses avatarURL — normalized to imageURL below.
const TYPE_FIELDS: Record<string, string> = {
  Category: 'id name descShort imageURL',
  Item: 'id name desc imageURL',
  Variant: 'id name desc imageURL',
  Org: 'id name desc avatarURL',
  Place: 'id name desc',
}

const { resolveClient } = useApolloClient()
const recentlyViewed = useRecentStore()
const displayItems = ref<DisplayItem[]>([])

async function fetchDisplayItems() {
  const entries = recentlyViewed.items
  if (entries.length === 0) {
    displayItems.value = []
    return
  }

  const varDefs = entries.map((_, i) => `$id${i}: ID!`).join(', ')
  const fields = entries
    .map((e, i) => {
      const resolver = TYPE_RESOLVER[e.__typename] ?? e.__typename.toLowerCase()
      const typeFields = TYPE_FIELDS[e.__typename] ?? 'id name'
      return `entry_${i}: ${resolver}(id: $id${i}) { ${typeFields} }`
    })
    .join('\n')

  const variables = Object.fromEntries(entries.map((e, i) => [`id${i}`, e.id]))
  const doc = parse(`query RecentlyViewedFetch(${varDefs}) { ${fields} }`)

  const result = await resolveClient().query({ query: doc, variables, fetchPolicy: 'cache-first' })

  displayItems.value = entries
    .map((e, i) => {
      const data = result.data[`entry_${i}`]
      if (!data) return null
      return {
        __typename: e.__typename,
        ...data,
        imageURL: data.avatarURL ?? data.imageURL,
      } as DisplayItem
    })
    .filter((x): x is DisplayItem => x !== null)
}

onMounted(async () => {
  await recentlyViewed.load()
  await fetchDisplayItems()
})

watch(() => recentlyViewed.items, fetchDisplayItems)

const typeBadgeVariant = (type: string) => {
  switch (type) {
    case 'Category':
      return 'blue'
    case 'Variant':
      return 'teal'
    case 'Item':
      return 'yellow'
    case 'Org':
      return 'gray'
    case 'Place':
      return 'red'
    default:
      return 'ghost'
  }
}

const formatType = (type: string) => {
  switch (type) {
    case 'Variant':
      return 'Product'
    case 'Org':
      return 'Organization'
    default:
      return type
  }
}

const placeholderIconMap: Record<string, Component> = {
  Category: BoxIcon,
  Item: PackageIcon,
  Variant: TagsIcon,
  Org: Building2Icon,
  Place: MapPinIcon,
}
const placeholderIcon = (type: string): Component => placeholderIconMap[type] ?? CircleHelpIcon

const exploreLink = (type: string, id: string) => {
  switch (type) {
    case 'Category':
      return `/explore/categories/${id}`
    case 'Item':
      return `/explore/items/${id}`
    case 'Variant':
      return `/explore/variants/${id}`
    case 'Org':
      return `/explore/orgs/${id}`
    case 'Place':
      return `/explore/places/${id}`
    default:
      return '#'
  }
}
</script>

<style scoped>
path,
circle {
  filter: url(#inset-shadow);
}
</style>
