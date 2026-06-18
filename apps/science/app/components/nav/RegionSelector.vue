<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button class="btn mx-3 justify-start bg-zinc-600/30 hover:bg-zinc-300/50" variant="ghost">
        <GlobeIcon :size="16" class="mr-1 opacity-60" />
        <span v-if="!regionStore.selectedRegionId" class="opacity-60">Global Region</span>
        <span v-else class="max-w-[150px] truncate">{{ selectedRegionName || 'Loading...' }}</span>
      </Button>
    </DialogTrigger>
    <DialogContent class="top-[20%] translate-y-0 overflow-hidden p-0 sm:max-w-[500px]">
      <div class="flex h-full w-full flex-col overflow-hidden rounded-xl bg-base-100">
        <!-- Search input row -->
        <div class="flex items-center border-b border-base-content/10 px-4">
          <SearchIcon :size="20" class="shrink-0 opacity-40" />
          <input
            ref="inputRef"
            v-model="searchInput"
            type="text"
            placeholder="Search for a region..."
            class="flex h-14 w-full rounded-md border-0 bg-transparent py-3 pl-3 text-base text-base-content outline-none placeholder:opacity-35"
          />
          <button
            v-if="searchInput"
            class="shrink-0 rounded p-1.5 opacity-40 transition hover:opacity-80"
            @click="searchInput = ''"
          >
            <XIcon :size="16" />
          </button>
        </div>

        <!-- Global Region Option -->
        <div v-if="!debouncedSearch" class="p-2">
          <button
            class="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-base-200 focus:bg-base-200 focus:outline-none"
            @click="selectRegion(null)"
          >
            <GlobeIcon class="size-6 opacity-50" />
            <div>
              <div class="font-medium">Global Region</div>
              <div class="text-xs opacity-60">Clear region filter</div>
            </div>
          </button>
        </div>

        <!-- Results area -->
        <div
          v-if="debouncedSearch"
          class="max-h-[400px] overflow-x-hidden overflow-y-auto"
          role="listbox"
        >
          <!-- Loading skeleton -->
          <div v-if="searchStatus === 'pending'" class="flex flex-col gap-1 p-3">
            <div v-for="i in 3" :key="i" class="flex items-center gap-4 rounded-lg px-3 py-3">
              <div class="size-8 shrink-0 skeleton rounded-full" />
              <div class="flex flex-1 flex-col gap-2">
                <div class="h-3.5 w-32 skeleton rounded" />
                <div class="h-3 w-20 skeleton rounded" />
              </div>
            </div>
          </div>

          <!-- Results list -->
          <div v-else-if="regions.length > 0" class="flex flex-col gap-0.5 p-3">
            <button
              v-for="res in regions"
              :key="res.id"
              class="flex items-center gap-4 rounded-lg px-3 py-3 text-left transition-colors hover:bg-base-200 focus:bg-base-200 focus:outline-none"
              @click="selectRegion(res)"
            >
              <div
                class="flex size-10 shrink-0 items-center justify-center rounded-lg border border-base-content/10 bg-base-200"
              >
                <MapPinIcon :size="18" class="opacity-50" />
              </div>
              <div class="min-w-0 flex-1">
                <div class="truncate text-sm font-semibold">{{ res.name }}</div>
                <div v-if="res.desc" class="truncate text-xs opacity-80">{{ res.desc }}</div>
                <div class="text-xs opacity-60">{{ res.placetype }}</div>
              </div>
            </button>
          </div>

          <!-- No results -->
          <div
            v-else-if="showNoResults"
            class="flex flex-col items-center justify-center gap-3 py-10 text-base-content/40"
          >
            <p class="text-sm">No regions found for "{{ debouncedSearch }}"</p>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { GlobeIcon, MapPinIcon, SearchIcon, XIcon } from '@lucide/vue'
import { watchDebounced } from '@vueuse/core'

import { graphql } from '~/gql'
import type { RegionSelectorSearchQuery } from '~/gql/graphql'

type SearchResultNode = NonNullable<RegionSelectorSearchQuery['search']['nodes']>[number]

const open = ref(false)
const searchInput = ref('')
const debouncedSearch = ref('')
const inputRef = ref<HTMLInputElement | null>(null)
const regionStore = useRegionStore()

const selectedRegionName = ref('')

watch(open, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    inputRef.value?.focus()
  } else {
    searchInput.value = ''
    debouncedSearch.value = ''
  }
})

watchDebounced(
  searchInput,
  (val) => {
    debouncedSearch.value = val
  },
  { debounce: 300 },
)

const regionSearchQuery = graphql(`
  query RegionSelectorSearch($query: String!) {
    search(query: $query, types: [REGION]) {
      nodes {
        __typename
        ... on Region {
          id
          name
          desc
          placetype
        }
      }
    }
  }
`)

const { result: searchData, loading: searchLoading } = useQuery(
  regionSearchQuery,
  () => ({ query: debouncedSearch.value }),
  () => ({ enabled: debouncedSearch.value.length >= 2 }),
)

const searchStatus = ref<'idle' | 'pending'>('idle')
watch(searchLoading, (loading) => {
  searchStatus.value = loading ? 'pending' : 'idle'
})

const showNoResults = computed(() => {
  return (
    debouncedSearch.value.length >= 2 &&
    searchStatus.value !== 'pending' &&
    regions.value.length === 0
  )
})

function isRegion(
  node: SearchResultNode,
): node is Extract<SearchResultNode, { __typename: 'Region' }> {
  return node.__typename === 'Region'
}

const regions = computed(() => {
  return searchData.value?.search.nodes?.filter(isRegion) ?? []
})

const currentRegionQuery = graphql(`
  query RegionSelectorCurrent($id: ID!) {
    region(id: $id) {
      id
      name
    }
  }
`)

const { result: currentRegionData, load: loadCurrentRegion } = useLazyQuery(
  currentRegionQuery,
  () => ({ id: regionStore.selectedRegionId ?? '' }),
  () => ({ enabled: !!regionStore.selectedRegionId }),
)

watch(currentRegionData, (data) => {
  if (data?.region?.name) {
    selectedRegionName.value = data.region.name
  }
})

watch(
  () => regionStore.selectedRegionId,
  (newId) => {
    if (newId) {
      loadCurrentRegion()
    } else {
      selectedRegionName.value = ''
    }
  },
  { immediate: true },
)

const selectRegion = (region: { id: string; name?: string | null } | null) => {
  if (region) {
    regionStore.setRegion(region.id)
    selectedRegionName.value = region.name || ''
  } else {
    regionStore.setRegion(undefined)
  }
  open.value = false
}
</script>
