<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button
        class="btn mx-3 w-48 justify-start bg-zinc-600/30 hover:bg-zinc-300/50"
        variant="ghost"
      >
        <SearchIcon :size="16" class="mr-1 opacity-60" />
        <span class="opacity-60">Search...</span>
        <kbd
          class="pointer-events-none ml-auto hidden items-center gap-1 rounded border border-base-content/20 bg-base-content/10 px-1.5 py-0.5 font-mono text-[10px] opacity-60 select-none sm:flex"
        >
          <span class="text-[10px]">⌘</span>K
        </kbd>
      </Button>
    </DialogTrigger>
    <DialogContent class="top-[20%] translate-y-0 overflow-hidden p-0 sm:max-w-[640px]">
      <div class="flex h-full w-full flex-col overflow-hidden rounded-xl bg-base-100">
        <!-- Search input row -->
        <div class="flex items-center border-b border-base-content/10 px-4">
          <SearchIcon :size="20" class="shrink-0 opacity-40" />
          <input
            ref="inputRef"
            v-model="searchInput"
            type="text"
            placeholder="Search categories, items, orgs, places…"
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

        <!-- Results area -->
        <div class="max-h-[480px] overflow-x-hidden overflow-y-auto">
          <!-- Loading skeleton -->
          <div v-if="loading" class="flex flex-col gap-1 p-3">
            <div v-for="i in 5" :key="i" class="flex items-center gap-4 rounded-lg px-3 py-3">
              <div class="size-11 shrink-0 skeleton rounded-lg" />
              <div class="flex flex-1 flex-col gap-2">
                <div class="h-3.5 w-28 skeleton rounded" />
                <div class="h-3 w-48 skeleton rounded" />
              </div>
            </div>
          </div>

          <!-- Results list -->
          <div v-else-if="results.length > 0" class="flex flex-col gap-0.5 p-3">
            <div
              v-if="totalCount"
              class="px-3 pt-0.5 pb-1.5 text-xs tracking-wide text-base-content/40"
            >
              About {{ totalCount }} result{{ totalCount !== 1 ? 's' : '' }}
            </div>
            <ul class="list" @click="open = false">
              <template v-for="item in results" :key="item.id">
                <ModelListCategory
                  v-if="item.__typename === 'Category'"
                  :category="item"
                  :href="`/categories/${item.id}`"
                />
                <ModelListItem
                  v-else-if="item.__typename === 'Item'"
                  :item="item"
                  :href="`/items/${item.id}`"
                />
                <ModelListVariant
                  v-else-if="item.__typename === 'Variant'"
                  :variant="item"
                  :href="`/variants/${item.id}`"
                />
                <ModelListComponent
                  v-else-if="item.__typename === 'Component'"
                  :component="item"
                  :href="`/components/${item.id}`"
                />
                <ModelListOrg
                  v-else-if="item.__typename === 'Org'"
                  :org="item"
                  :href="`/orgs/${item.id}`"
                />
                <ModelListPlace
                  v-else-if="item.__typename === 'Place'"
                  :place="item"
                  :href="`/places/${item.id}`"
                />
                <ModelListMaterial
                  v-else-if="item.__typename === 'Material'"
                  :material="item"
                  :on-row-click="
                    () => {
                      open = false
                      navigateTo(`/materials/${item.id}`)
                    }
                  "
                />
              </template>
            </ul>
          </div>

          <!-- No results -->
          <div
            v-else-if="debouncedSearch.length >= 2 && !loading"
            class="flex flex-col items-center justify-center gap-3 py-14 text-base-content/40"
          >
            <SearchXIcon :size="32" />
            <p class="text-sm">
              No results for <strong>"{{ debouncedSearch }}"</strong>
            </p>
          </div>

          <!-- Empty / prompt state -->
          <div
            v-else-if="!debouncedSearch"
            class="flex flex-col items-center justify-center gap-3 py-14 text-base-content/30"
          >
            <SearchIcon :size="32" />
            <p class="text-sm">Type to search</p>
          </div>
        </div>

        <!-- Footer hint -->
        <div
          v-if="debouncedSearch"
          class="flex items-center gap-4 border-t border-base-content/10 px-5 py-2.5 text-xs text-base-content/30"
        >
          <span class="flex items-center gap-1.5">
            <kbd class="rounded border border-base-content/20 px-1.5 py-0.5 font-mono">↵</kbd> to
            open
          </span>
          <span class="flex items-center gap-1.5">
            <kbd class="rounded border border-base-content/20 px-1.5 py-0.5 font-mono">↑↓</kbd>
            navigate
          </span>
          <span class="flex items-center gap-1.5">
            <kbd class="rounded border border-base-content/20 px-1.5 py-0.5 font-mono">esc</kbd>
            close
          </span>
          <button
            class="ml-auto flex items-center gap-1 rounded px-2 py-1 transition hover:bg-base-200 hover:text-base-content/60"
            @click="
              () => {
                open = false
                navigateTo(`/dashboard/search?q=${debouncedSearch}`)
              }
            "
          >
            Open in Search
            <ExternalLinkIcon class="ml-1 size-3.5" />
          </button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ExternalLinkIcon, SearchIcon, SearchXIcon, XIcon } from '@lucide/vue'
import { useEventListener, watchDebounced } from '@vueuse/core'

import { graphql } from '~/gql'

const open = ref(false)
const searchInput = ref('')
const debouncedSearch = ref('')
const inputRef = ref<HTMLInputElement | null>(null)

// Open with Cmd+K / Ctrl+K
useEventListener(document, 'keydown', (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    open.value = !open.value
  }
})

// Focus input when dialog opens
watch(open, async (isOpen) => {
  if (isOpen) {
    await nextTick()
    inputRef.value?.focus()
  } else {
    searchInput.value = ''
    debouncedSearch.value = ''
  }
})

// 300ms debounce
watchDebounced(
  searchInput,
  (val) => {
    debouncedSearch.value = val
  },
  { debounce: 300 },
)

const searchQuery = graphql(`
  query ScienceSearch($query: String!) {
    search(query: $query, types: [CATEGORY, ITEM, VARIANT, COMPONENT, ORG, PLACE, MATERIAL]) {
      nodes {
        __typename
        ... on Category {
          id
          ...ListCategoryFragment
        }
        ... on Item {
          id
          ...ListItemFragment
        }
        ... on Variant {
          id
          ...ListVariantFragment
        }
        ... on Component {
          id
          ...ListComponentFragment
        }
        ... on Org {
          id
          ...ListOrgFragment
        }
        ... on Place {
          id
          ...ListPlaceFragment
        }
        ... on Material {
          id
          ...ListMaterialFragment
        }
        ... on Region {
          id
        }
      }
      totalCount
    }
  }
`)

const { result, loading } = useQuery(
  searchQuery,
  () => ({ query: debouncedSearch.value }),
  () => ({ enabled: debouncedSearch.value.length >= 2 }),
)

const results = computed(() => result.value?.search.nodes ?? [])
const totalCount = computed(() => result.value?.search.totalCount ?? 0)

// Enter key navigates to first result
useEventListener(document, 'keydown', (e: KeyboardEvent) => {
  if (!open.value || e.key !== 'Enter') return
  const item = results.value[0]
  if (item) {
    e.preventDefault()
    navigateTo(routeForItem(item.__typename, item.id))
    open.value = false
  }
})

function routeForItem(type: string, id: string): string {
  switch (type) {
    case 'Category':
      return `/categories/${id}`
    case 'Item':
      return `/items/${id}`
    case 'Variant':
      return `/variants/${id}`
    case 'Component':
      return `/components/${id}`
    case 'Org':
      return `/orgs/${id}`
    case 'Place':
      return `/places/${id}`
    case 'Material':
      return `/materials/${id}`
    default:
      return '#'
  }
}
</script>
