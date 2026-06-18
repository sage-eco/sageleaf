<template>
  <div>
    <div class="flex items-center gap-3 p-3">
      <Button variant="ghost" @click="router.back()">
        <ArrowLeft class="size-4" />
      </Button>
      <h1 class="text-xl font-bold">Link Components to Variants</h1>
    </div>

    <div v-if="!isChangeSelected" role="alert" class="mx-3 mb-3 alert alert-warning">
      <span>Select a change from the sidebar to link entities.</span>
    </div>

    <div class="flex flex-col gap-3 p-3 lg:flex-row">
      <!-- LEFT PANE: Variant navigation + detail + existing links -->
      <div class="flex min-w-0 flex-1 flex-col gap-3">
        <!-- Search bar to select a variant -->
        <Card class="border-0 bg-base-100 shadow-md">
          <CardContent class="flex flex-col gap-3 py-3">
            <div class="relative">
              <Search
                class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-base-content/40"
              />
              <FormInput
                v-model="entitySearchInput"
                placeholder="Search variants…"
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
                    <div v-if="result.desc" class="truncate text-xs opacity-60">
                      {{ result.desc }}
                    </div>
                  </div>
                </button>
              </template>
              <div
                v-else-if="!entitySearchLoading && debouncedEntitySearch.length >= 2"
                class="py-8 text-center text-sm opacity-50"
              >
                No variants found for "{{ debouncedEntitySearch }}"
              </div>
              <div v-else class="py-8 text-center text-sm opacity-40">
                Type to search for variants to view
              </div>
            </div>
          </CardContent>
        </Card>

        <!-- Variant detail -->
        <div v-if="currentId && detailLoading" class="flex justify-center p-8">
          <span class="loading loading-lg loading-spinner" />
        </div>
        <Card v-if="entity" class="border-0 bg-base-100 shadow-md">
          <CardHeader>
            <CardTitle>
              <NuxtLink :to="`/variants/${entity.id}`" class="link link-hover">
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
              <div v-if="entity.desc" class="text-xs opacity-60">{{ entity.desc }}</div>
            </div>
          </CardContent>
        </Card>

        <!-- Existing linked components -->
        <Card v-if="entity" class="border-0 bg-base-100 shadow-md">
          <CardHeader>
            <CardTitle> Linked Components ({{ entity.components?.nodes?.length ?? 0 }}) </CardTitle>
          </CardHeader>
          <CardContent>
            <ul class="list">
              <li
                v-for="vc in entity.components?.nodes ?? []"
                :key="vc.component.id"
                class="flex items-center"
              >
                <div class="flex-1">
                  <ModelListComponent
                    :component="vc.component"
                    :href="`/components/${vc.component.id}`"
                  />
                  <div v-if="vc.quantity" class="pl-4 text-xs opacity-60">
                    {{ vc.quantity }}{{ vc.unit ? ` ${vc.unit}` : '' }}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  class="shrink-0 text-red-500 hover:text-red-600"
                  :disabled="!isChangeSelected || unlinkingId === vc.component.id"
                  @click="requireAuth(() => doUnlink(vc.component.id))"
                >
                  <span
                    v-if="unlinkingId === vc.component.id"
                    class="loading loading-xs loading-spinner"
                  />
                  <X v-else class="size-4" />
                </Button>
              </li>
            </ul>
            <div v-if="!entity.components?.nodes?.length" class="text-sm opacity-60">
              None linked
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- RIGHT PANE: Search + select + link -->
      <div class="flex min-w-0 flex-1 flex-col gap-3">
        <Card class="border-0 bg-base-100 shadow-md">
          <CardHeader>
            <CardTitle>Search Components to Link</CardTitle>
          </CardHeader>
          <CardContent class="flex flex-col gap-3">
            <div class="relative">
              <Search
                class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-base-content/40"
              />
              <FormInput
                v-model="searchInput"
                placeholder="Search components…"
                class="w-full pl-9 text-sm"
              />
            </div>

            <div class="max-h-[40vh] overflow-y-auto">
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
                Type to search for components to link
              </div>
            </div>

            <!-- Per-component quantity/unit inputs -->
            <div
              v-if="selectedIds.size > 0"
              class="flex flex-col gap-2 border-t border-base-content/10 pt-3"
            >
              <div class="text-sm font-medium opacity-70">Quantity & Unit (optional)</div>
              <div
                v-for="id in [...selectedIds]"
                :key="id"
                class="flex items-center gap-2 rounded-lg bg-base-200 px-3 py-2"
              >
                <div class="min-w-0 flex-1 truncate text-sm">
                  {{ searchResultsMap[id]?.name ?? id }}
                </div>
                <FormInput
                  v-model.number="inputFor(id).quantity"
                  placeholder="Qty"
                  class="w-20"
                  min="0"
                  step="any"
                />
                <FormInput v-model="inputFor(id).unit" placeholder="Unit" class="w-20" />
              </div>
            </div>

            <div class="flex items-center justify-between border-t border-base-content/10 pt-3">
              <Button
                variant="ghost"
                size="sm"
                :disabled="selectedIds.size === 0"
                @click="clearSelection"
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
import { ArrowLeft, Box, Link2, Search, X } from '@lucide/vue'
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
  query LinkEntitySearchVariants($query: String!) {
    search(query: $query, types: [VARIANT]) {
      nodes {
        __typename
        ... on Variant {
          id
          name
          desc
          imageURL
        }
      }
    }
  }
`)

type EntitySearchNode = {
  id: string
  name?: string | null
  desc?: string | null
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
      (n): n is NonNullable<typeof n> & { __typename: 'Variant' } => n?.__typename === 'Variant',
    )
    .map((n) => ({ id: n.id, name: n.name, desc: n.desc, imageURL: n.imageURL }))
})

const selectEntity = (id: string) => {
  currentId.value = id
}

// ── Variant detail ─────────────────────────────────────────────────────────────

const detailQuery = graphql(`
  query LinkVariantDetailQuery($id: ID!) {
    variant(id: $id) {
      id
      name
      desc
      imageURL
      components(first: 50) {
        nodes {
          component {
            id
            ...ListComponentFragment
          }
          quantity
          unit
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

const entity = computed(() => detailResult.value?.variant ?? undefined)

// ── Search ─────────────────────────────────────────────────────────────────────

const searchInput = ref('')
const debouncedSearch = ref('')

watchDebounced(searchInput, (val) => (debouncedSearch.value = val), { debounce: 300 })

const searchQuery = graphql(`
  query LinkComponentsSearch($query: String!) {
    search(query: $query, types: [COMPONENT]) {
      nodes {
        __typename
        ... on Component {
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
  () => ({ query: debouncedSearch.value }),
  () => ({ enabled: debouncedSearch.value.length >= 2 }),
)

const searchResults = computed<SearchNode[]>(() => {
  const nodes = searchData.value?.search?.nodes ?? []
  return nodes
    .filter(
      (n): n is NonNullable<typeof n> & { __typename: 'Component' } =>
        n?.__typename === 'Component',
    )
    .map((n) => ({ id: n.id, name: n.name, desc: n.desc, imageURL: n.imageURL }))
})

const searchResultsMap = computed<Record<string, SearchNode>>(() => {
  return Object.fromEntries(searchResults.value.map((r) => [r.id, r]))
})

// ── Selection ──────────────────────────────────────────────────────────────────

const selectedIds = reactive(new Set<string>())
const componentInputs = reactive<Record<string, { quantity?: number; unit?: string }>>({})

// Safe accessor — invariant: componentInputs[id] always exists when id is in selectedIds
const inputFor = (id: string) => componentInputs[id] as { quantity?: number; unit?: string }

const toggleSelected = (id: string) => {
  if (selectedIds.has(id)) {
    selectedIds.delete(id)
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete componentInputs[id]
  } else {
    selectedIds.add(id)
    componentInputs[id] = {}
  }
}

const clearSelection = () => {
  selectedIds.clear()
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  Object.keys(componentInputs).forEach((k) => delete componentInputs[k])
}

// ── Mutations ──────────────────────────────────────────────────────────────────

const addRefMutation = graphql(`
  mutation LinkVariantAddComponents($model: EditModelType!, $id: ID!, $input: AddRefInput!) {
    addRef(model: $model, id: $id, input: $input) {
      change {
        id
      }
    }
  }
`)

const removeRefMutation = graphql(`
  mutation LinkVariantRemoveComponent($model: EditModelType!, $id: ID!, $input: RemoveRefInput!) {
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
    const refs = [...selectedIds]
    const inputs = refs.map((id) => {
      const inp = componentInputs[id] ?? {}
      const result: Record<string, unknown> = {}
      if (inp.quantity !== null && inp.quantity !== undefined && !isNaN(inp.quantity))
        result.quantity = inp.quantity
      if (inp.unit?.trim()) result.unit = inp.unit.trim()
      return result
    })
    await addRef({
      model: EditModelType.Variant,
      id: entity.value.id,
      input: {
        refModel: RefModelType.Component,
        refs,
        inputs,
        changeID: selectedChange.value,
      },
    })
    clearSelection()
    await refetchDetail()
  } finally {
    linking.value = false
  }
}

const doUnlink = async (componentId: string) => {
  if (!entity.value || !selectedChange.value) return
  unlinkingId.value = componentId
  try {
    await removeRef({
      model: EditModelType.Variant,
      id: entity.value.id,
      input: {
        refModel: RefModelType.Component,
        ref: componentId,
        changeID: selectedChange.value,
      },
    })
    await refetchDetail()
  } finally {
    unlinkingId.value = null
  }
}
</script>
