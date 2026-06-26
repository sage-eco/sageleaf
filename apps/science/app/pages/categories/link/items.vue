<template>
  <div>
    <div class="flex items-center gap-3 p-3">
      <Button variant="ghost" @click="router.back()">
        <ArrowLeft class="size-4" />
      </Button>
      <h1 class="text-xl font-bold">Link Items to Categories</h1>
    </div>

    <div v-if="!isChangeSelected" role="alert" class="mx-3 mb-3 alert alert-warning">
      <span>Select a change from the sidebar to link entities.</span>
    </div>

    <div class="flex flex-col gap-3 p-3 lg:flex-row">
      <!-- LEFT PANE: Category navigation + detail + existing links -->
      <div class="flex min-w-0 flex-1 flex-col gap-3">
        <!-- Search bar to select a category -->
        <Card class="border-0 bg-base-100 shadow-md">
          <CardContent class="flex flex-col gap-3 py-3">
            <div class="relative">
              <Search
                class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-base-content/40"
              />
              <FormInput
                v-model="entitySearchInput"
                placeholder="Search categories…"
                class="w-full pl-9 text-sm"
              />
            </div>
            <div class="max-h-[40vh] overflow-y-auto">
              <div v-if="entitySearchLoading" class="flex flex-col gap-1 py-2">
                <div v-for="i in 4" :key="i" class="flex items-center gap-3 px-2 py-2">
                  <div class="size-8 shrink-0 skeleton rounded" />
                  <div class="h-3 w-32 skeleton rounded" />
                </div>
              </div>
              <template v-else-if="entitySearchResults.length > 0">
                <button
                  v-for="result in entitySearchResults"
                  :key="result.id"
                  class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-base-200"
                  :class="{ 'bg-base-200': currentId === result.id }"
                  @click="selectEntity(result.id)"
                >
                  <UiImage
                    v-if="result.imageURL"
                    class="size-8 shrink-0 rounded"
                    :src="result.imageURL"
                  />
                  <div
                    v-else
                    class="flex size-8 shrink-0 items-center justify-center rounded border border-base-content/10 bg-base-200"
                  >
                    <Box class="size-4 opacity-30" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-medium">{{ result.name }}</div>
                    <div v-if="result.descShort" class="truncate text-xs opacity-60">
                      {{ result.descShort }}
                    </div>
                  </div>
                </button>
              </template>
              <div
                v-else-if="!entitySearchLoading && debouncedEntitySearch.length >= 2"
                class="py-8 text-center text-sm opacity-50"
              >
                No categories found for "{{ debouncedEntitySearch }}"
              </div>
              <div v-else class="py-8 text-center text-sm opacity-40">
                Type to search for categories to view
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Category detail -->
        <div v-if="currentId && detailLoading" class="flex justify-center p-8">
          <span class="loading loading-lg loading-spinner" />
        </div>
        <Card v-if="entity" class="border-0 bg-base-100 shadow-md">
          <CardHeader>
            <CardTitle>
              <NuxtLink :to="`/categories/${entity.id}`" class="link link-hover">
                {{ entity.name }}
              </NuxtLink>
            </CardTitle>
          </CardHeader>
          <CardContent class="flex gap-4">
            <UiImage
              v-if="entity.imageURL"
              class="size-20 shrink-0 rounded"
              :src="entity.imageURL"
            />
            <div class="flex flex-col gap-1 text-sm">
              <div v-if="entity.descShort">{{ entity.descShort }}</div>
              <div v-if="entity.desc" class="text-xs opacity-60">{{ entity.desc }}</div>
            </div>
          </CardContent>
        </Card>

        <!-- Existing linked items -->
        <Card v-if="entity" class="border-0 bg-base-100 shadow-md">
          <CardHeader>
            <CardTitle>Linked Items ({{ entity.items?.nodes?.length ?? 0 }})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul class="list">
              <li
                v-for="item in entity.items?.nodes ?? []"
                :key="item.id"
                class="flex items-center"
              >
                <div class="flex-1">
                  <ModelListItem :item="item" :href="`/items/${item.id}`" />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  class="shrink-0 text-red-500 hover:text-red-600"
                  :disabled="!isChangeSelected || unlinkingId === item.id"
                  @click="requireAuth(() => doUnlink(item.id))"
                >
                  <span v-if="unlinkingId === item.id" class="loading loading-xs loading-spinner" />
                  <X v-else class="size-4" />
                </Button>
              </li>
            </ul>
            <div v-if="!entity.items?.nodes?.length" class="text-sm opacity-60">None linked</div>
          </CardContent>
        </Card>
      </div>

      <!-- RIGHT PANE: Search + select + link -->
      <div class="flex min-w-0 flex-1 flex-col gap-3">
        <Card class="border-0 bg-base-100 shadow-md">
          <CardHeader>
            <CardTitle>Search Items to Link</CardTitle>
          </CardHeader>
          <CardContent class="flex flex-col gap-3">
            <div class="relative">
              <Search
                class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-base-content/40"
              />
              <FormInput
                v-model="searchInput"
                placeholder="Search items…"
                class="w-full pl-9 text-sm"
              />
            </div>

            <div class="max-h-[50vh] overflow-y-auto">
              <div v-if="searchLoading" class="flex flex-col gap-1 py-2">
                <div v-for="i in 4" :key="i" class="flex items-center gap-3 px-2 py-2">
                  <div class="size-4 shrink-0 skeleton rounded" />
                  <div class="size-8 shrink-0 skeleton rounded" />
                  <div class="h-3 w-32 skeleton rounded" />
                </div>
              </div>
              <template v-else-if="searchResults.length > 0">
                <label
                  v-for="result in searchResults"
                  :key="result.id"
                  class="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-base-200"
                >
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    :checked="selectedIds.has(result.id)"
                    @change="toggleSelected(result.id)"
                  />
                  <UiImage
                    v-if="result.imageURL"
                    class="size-8 shrink-0 rounded"
                    :src="result.imageURL"
                  />
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-sm font-medium">{{ result.name }}</div>
                    <div v-if="result.desc" class="truncate text-xs opacity-60">
                      {{ result.desc }}
                    </div>
                  </div>
                </label>
              </template>
              <div
                v-else-if="!searchLoading && debouncedSearch.length >= 2"
                class="py-8 text-center text-sm opacity-50"
              >
                No results for "{{ debouncedSearch }}"
              </div>
              <div v-else class="py-8 text-center text-sm opacity-40">
                Type to search for items to link
              </div>
            </div>

            <div
              v-if="searchResults.length > 0 && searchTotalCount > 0"
              class="flex items-center justify-between text-xs"
            >
              <span class="opacity-60">
                {{ searchOffset + 1 }}–{{
                  Math.min(searchOffset + SEARCH_PAGE_SIZE, searchTotalCount)
                }}
                of {{ searchTotalCount }}
              </span>
              <div class="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  :disabled="!searchHasPreviousPage"
                  title="Previous"
                  @click="prevSearchPage"
                >
                  <ChevronLeft :size="16" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  :disabled="!searchHasNextPage"
                  title="Next"
                  @click="nextSearchPage"
                >
                  <ChevronRight :size="16" />
                </Button>
              </div>
            </div>

            <div class="flex items-center justify-between border-t border-base-content/10 pt-3">
              <Button
                variant="ghost"
                size="sm"
                :disabled="selectedIds.size === 0"
                @click="selectedIds.clear()"
              >
                Clear ({{ selectedIds.size }})
              </Button>
              <Button
                :disabled="selectedIds.size === 0 || !isChangeSelected || !entity || linking"
                @click="requireAuth(doLink)"
              >
                <span v-if="linking" class="loading loading-xs loading-spinner" />
                <Link2 v-else class="size-4" />
                Link {{ selectedIds.size > 0 ? selectedIds.size + ' ' : '' }}Selected
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Box, ChevronLeft, ChevronRight, Link2, Search, X } from '@lucide/vue'
import { watchDebounced } from '@vueuse/core'

import { graphql } from '~/gql'
import { EditModelType, RefModelType } from '~/gql/graphql'

const router = useRouter()
const { requireAuth } = useRequireAuth()
const changeStore = useChangeStore()
const { selectedChange, isChangeSelected } = storeToRefs(changeStore)

// ── Entity search & selection ─────────────────────────────────────────────────

const currentId = ref<string>()

const entitySearchInput = ref('')
const debouncedEntitySearch = ref('')

watchDebounced(entitySearchInput, (val) => (debouncedEntitySearch.value = val), { debounce: 300 })

const entitySearchQuery = graphql(`
  query LinkEntitySearchCategories($query: String!) {
    search(query: $query, types: [CATEGORY]) {
      nodes {
        __typename
        ... on Category {
          id
          name
          descShort
          imageURL
        }
      }
    }
  }
`)

type EntitySearchNode = {
  id: string
  name?: string | null
  descShort?: string | null
  imageURL?: string | null
}

const { result: entitySearchData, loading: entitySearchLoading } = useQuery(
  entitySearchQuery,
  () => ({ query: debouncedEntitySearch.value }),
  () => ({ enabled: debouncedEntitySearch.value.length >= 2 }),
)

const entitySearchResults = computed<EntitySearchNode[]>(() => {
  const nodes = entitySearchData.value?.search?.nodes ?? []
  return nodes
    .filter(
      (n): n is NonNullable<typeof n> & { __typename: 'Category' } => n?.__typename === 'Category',
    )
    .map((n) => ({ id: n.id, name: n.name, descShort: n.descShort, imageURL: n.imageURL }))
})

const selectEntity = (id: string) => {
  currentId.value = id
}

// ── Category detail ────────────────────────────────────────────────────────────

const detailQuery = graphql(`
  query LinkCategoryDetailQuery($id: ID!) {
    category(id: $id) {
      id
      name
      descShort
      desc
      imageURL
      items(first: 50) {
        nodes {
          id
          ...ListItemFragment
        }
      }
    }
  }
`)

const {
  result: detailResult,
  loading: detailLoading,
  refetch: refetchDetail,
} = useQuery(
  detailQuery,
  () => ({ id: currentId.value ?? '' }),
  () => ({ enabled: !!currentId.value }),
)

const entity = computed(() => detailResult.value?.category ?? null)

// ── Search ─────────────────────────────────────────────────────────────────────

const searchInput = ref('')
const debouncedSearch = ref('')

watchDebounced(searchInput, (val) => (debouncedSearch.value = val), { debounce: 300 })

const SEARCH_PAGE_SIZE = 20
const searchOffset = ref(0)

watch(debouncedSearch, () => {
  searchOffset.value = 0
})

const searchQuery = graphql(`
  query LinkItemsSearch($query: String!, $limit: Int, $offset: Int) {
    search(query: $query, types: [ITEM], limit: $limit, offset: $offset) {
      totalCount
      nodes {
        __typename
        ... on Item {
          id
          name
          desc
          imageURL
        }
      }
    }
  }
`)

type SearchNode = {
  id: string
  name?: string | null
  desc?: string | null
  imageURL?: string | null
}

const { result: searchData, loading: searchLoading } = useQuery(
  searchQuery,
  () => ({
    query: debouncedSearch.value,
    limit: SEARCH_PAGE_SIZE,
    offset: searchOffset.value,
  }),
  () => ({ enabled: debouncedSearch.value.length >= 2 }),
)

const searchResults = computed<SearchNode[]>(() => {
  const nodes = searchData.value?.search?.nodes ?? []
  return nodes
    .filter((n): n is NonNullable<typeof n> & { __typename: 'Item' } => n?.__typename === 'Item')
    .map((n) => ({ id: n.id, name: n.name, desc: n.desc, imageURL: n.imageURL }))
})

const searchTotalCount = computed(() => searchData.value?.search?.totalCount ?? 0)
const searchHasNextPage = computed(
  () => searchOffset.value + SEARCH_PAGE_SIZE < searchTotalCount.value,
)
const searchHasPreviousPage = computed(() => searchOffset.value > 0)

const nextSearchPage = () => {
  if (searchHasNextPage.value) searchOffset.value += SEARCH_PAGE_SIZE
}

const prevSearchPage = () => {
  if (searchHasPreviousPage.value) searchOffset.value -= SEARCH_PAGE_SIZE
}

// ── Selection ──────────────────────────────────────────────────────────────────

const selectedIds = reactive(new Set<string>())

const toggleSelected = (id: string) => {
  if (selectedIds.has(id)) selectedIds.delete(id)
  else selectedIds.add(id)
}

// ── Mutations ──────────────────────────────────────────────────────────────────

const addRefMutation = graphql(`
  mutation LinkCategoryAddItems($model: EditModelType!, $id: ID!, $input: AddRefInput!) {
    addRef(model: $model, id: $id, input: $input) {
      change {
        id
      }
    }
  }
`)

const removeRefMutation = graphql(`
  mutation LinkCategoryRemoveItem($model: EditModelType!, $id: ID!, $input: RemoveRefInput!) {
    removeRef(model: $model, id: $id, input: $input) {
      change {
        id
      }
    }
  }
`)

const { mutate: addRef } = useMutation(addRefMutation)
const { mutate: removeRef } = useMutation(removeRefMutation)

const linking = ref(false)
const unlinkingId = ref<string | null>(null)

const doLink = async () => {
  if (!entity.value || selectedIds.size === 0 || !selectedChange.value) return
  linking.value = true
  try {
    await addRef({
      model: EditModelType.Category,
      id: entity.value.id,
      input: {
        refModel: RefModelType.Item,
        refs: [...selectedIds],
        changeID: selectedChange.value,
      },
    })
    selectedIds.clear()
    await refetchDetail()
  } finally {
    linking.value = false
  }
}

const doUnlink = async (itemId: string) => {
  if (!entity.value || !selectedChange.value) return
  unlinkingId.value = itemId
  try {
    await removeRef({
      model: EditModelType.Category,
      id: entity.value.id,
      input: {
        refModel: RefModelType.Item,
        ref: itemId,
        changeID: selectedChange.value,
      },
    })
    await refetchDetail()
  } finally {
    unlinkingId.value = null
  }
}
</script>
