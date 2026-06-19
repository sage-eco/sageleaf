<template>
  <div>
    <div class="flex justify-center px-5 pt-5">
      <div class="grid w-full max-w-2xl grid-cols-2 rounded-lg bg-base-200 p-1">
        <NuxtLink to="/search">
          <button
            class="flex w-full items-center justify-center gap-1.5 rounded-md bg-base-100 py-1.5 text-sm shadow"
          >
            <SearchIcon :size="14" />
            Search
          </button>
        </NuxtLink>
        <NuxtLink to="/search/scan">
          <button class="flex w-full items-center justify-center gap-1.5 rounded-md py-1.5 text-sm">
            <ScanBarcodeIcon :size="14" />
            Scan
          </button>
        </NuxtLink>
      </div>
    </div>
    <div class="flex justify-center">
      <div class="w-full max-w-2xl px-5 pt-4">
        <div ref="searchBar" class="relative items-center">
          <FormInput
            id="search"
            v-model="searchInput"
            type="text"
            placeholder="Search..."
            class="pl-10"
          />
          <span class="absolute inset-y-0 inset-s-0 flex items-center justify-center px-2">
            <SearchIcon :size="20" class="mr-1 ml-2" />
          </span>
        </div>
        <ul class="list mt-4 mb-6 rounded-box bg-base-200 shadow-md">
          <li v-if="result?.search.totalCount" class="px-4 py-2 text-xs tracking-wide opacity-60">
            About {{ result?.search.totalCount || 0 }} results
          </li>
          <li v-if="loading" class="list-row">
            <div class="h-4 w-28 skeleton" />
            <div class="h-4 w-full skeleton" />
            <div class="h-4 w-full skeleton" />
          </li>

          <div v-if="result && !loading">
            <li v-for="res in result.search.nodes" :key="res.id">
              <NuxtLink :to="exploreLink(res.__typename, res.id)">
                <div v-if="res.id" class="list-row flex items-center gap-2 pt-2 pb-3">
                  <UiImage
                    v-if="res.imageURL"
                    :src="res.imageURL"
                    :width="20"
                    :height="20"
                    class="size-20 rounded-box"
                  />
                  <span
                    v-if="!res.imageURL"
                    class="flex size-20 items-center justify-center rounded-box border border-neutral-200"
                  >
                    <component :is="placeholderIcon(res.__typename)" class="size-8" />
                  </span>
                  <div class="flex-1 px-2">
                    <Badge :variant="typeBadgeVariant(res.__typename)" class="mb-1">
                      {{ formatType(res.__typename) }}
                    </Badge>
                    <div class="text-bold">
                      {{ res.name || res.name_null }}
                    </div>
                    <div class="text-xs opacity-70">
                      {{ res.descShort }}
                    </div>
                    <div v-if="res.orgs?.nodes.length" class="mt-0.5 text-xs opacity-50">
                      {{ res.orgs.nodes.map((n) => n.org.name).join(', ') }}
                    </div>
                  </div>
                  <button class="btn btn-square btn-ghost">
                    <ChevronRightIcon class="size-5" />
                  </button>
                </div>
              </NuxtLink>
            </li>
          </div>

          <li v-if="error" class="list-row text-xs text-error">
            {{ error.graphQLErrors?.[0]?.message || error.networkError?.message || error.message }}
          </li>
          <li v-if="result?.search.nodes.length === 0 && searchInput.length > 0" class="list-row">
            No results found for "{{ searchInput }}"
          </li>
          <SearchRecentlyViewed v-if="!result && searchInput.length === 0" />
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  BoxIcon,
  Building2Icon,
  ChevronRightIcon,
  CircleHelpIcon,
  MapPinIcon,
  PackageIcon,
  ScanBarcodeIcon,
  SearchIcon,
  TagsIcon,
} from '@lucide/vue'
import { useIntersectionObserver, watchDebounced } from '@vueuse/core'
import type { Component } from 'vue'

useTopbar(null)

onMounted(() => {
  ;(document.querySelector('#search') as HTMLElement)?.focus()
})

const searchQuery = gql`
  query Search($query: String!) {
    search(query: $query) {
      nodes {
        __typename
        ... on Category {
          id
          name
          descShort
          desc
          imageURL
        }
        ... on Item {
          id
          name_null: name
          desc
          imageURL
        }
        ... on Variant {
          id
          name_null: name
          desc
          imageURL
          orgs(first: 3) {
            nodes {
              org {
                name
              }
            }
          }
        }
        ... on Place {
          id
          name_null: name
          address {
            street
            city
            region
            country
          }
        }
        ... on Org {
          id
          name
          desc
        }
      }
      totalCount
    }
  }
`
const searchInput = shallowRef('')
const debouncedSearch = shallowRef('')

// Blur the keyboard when the search bar is scrolled out of view
const searchBar = useTemplateRef('searchBar')
useIntersectionObserver(
  searchBar,
  ([entry]: IntersectionObserverEntry[]) => {
    if (entry && !entry.isIntersecting) (document.activeElement as HTMLElement | null)?.blur()
  },
  { threshold: 0.5 },
)

watchDebounced(
  searchInput,
  (val) => {
    debouncedSearch.value = val
  },
  { debounce: 300 },
)

type SearchResult = {
  search: {
    nodes: {
      id: string
      name: string
      name_null: string
      descShort: string
      desc: string
      imageURL: string
      __typename: string
      orgs?: { nodes: { org: { name: string } }[] }
    }[]
    totalCount: number
  }
}

const { result, loading, error } = useQuery<SearchResult>(
  searchQuery,
  () => ({ query: debouncedSearch.value }),
  () => ({ enabled: debouncedSearch.value.length >= 2 }),
)

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
    case 'Category':
      return 'Category'
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
