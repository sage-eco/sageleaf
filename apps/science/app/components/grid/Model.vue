<template>
  <div>
    <Card class="m-3 border-0 bg-base-100 shadow-md">
      <CardHeader class="pb-2">
        <CardTitle class="flex justify-between">
          <span class="flex items-center gap-2">
            {{ title }}
            <span v-if="totalCount != null" class="text-sm font-normal text-base-content/50">
              {{ totalCount }} result{{ totalCount !== 1 ? 's' : '' }}
            </span>
          </span>
          <GridPagerButtons
            :has-previous-page="hasPreviousPage && !debouncedSearch"
            :has-next-page="hasNextPage && !debouncedSearch"
            @prev="prevPage"
            @next="nextPage"
          />
        </CardTitle>
        <div v-if="searchQuery" class="relative mt-2 max-w-sm">
          <span class="absolute inset-y-0 left-0 flex items-center pl-3 text-base-content/40">
            <SearchIcon :size="16" />
          </span>
          <FormInput
            v-model="searchInput"
            :placeholder="searchPlaceholder ?? 'Search...'"
            class="pl-9 text-sm"
          />
        </div>
        <CardDescription>{{ desc }}</CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          <ul class="list">
            <div v-for="n in nodes" :key="n.id">
              <slot :node="n" />
            </div>
          </ul>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import type { TypedDocumentNode } from '@graphql-typed-document-node/core'
import { SearchIcon } from '@lucide/vue'
import { watchDebounced } from '@vueuse/core'

const { title, desc, query, queryName, pageSize, searchQuery, searchPlaceholder } = defineProps<{
  title?: string
  desc?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: TypedDocumentNode<any, any>
  queryName: string
  pageSize?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  searchQuery?: TypedDocumentNode<any, any>
  searchPlaceholder?: string
}>()

const fetchCount = pageSize || 20
type CursorVars = {
  first?: number
  last?: number
  before: string | null
  after: string | null
  [key: string]: unknown
}

const searchInput = ref('')
const debouncedSearch = ref('')
watchDebounced(
  searchInput,
  (val) => {
    debouncedSearch.value = val
  },
  { debounce: 300 },
)

const isSearching = computed(() => !!searchQuery && debouncedSearch.value.length > 0)

const { result: mainResult, refetch: mainRefetch } = useQuery(query, {
  first: fetchCount,
  last: undefined,
  after: null,
  before: null,
} as CursorVars)

const { result: searchResult } = useQuery(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  searchQuery ?? (query as any),
  () =>
    ({
      query: debouncedSearch.value,
      first: fetchCount,
      last: undefined,
      after: null,
      before: null,
    }) as CursorVars,
  () => ({ enabled: isSearching.value }),
)

const activeResult = computed(() => (isSearching.value ? searchResult.value : mainResult.value))
const nodes = computed(() => activeResult.value?.[queryName]?.nodes || [])
const totalCount = computed<number | null>(
  () => activeResult.value?.[queryName]?.totalCount ?? null,
)
const hasPreviousPage = computed(
  () => activeResult.value?.[queryName]?.pageInfo?.hasPreviousPage || false,
)
const hasNextPage = computed(() => activeResult.value?.[queryName]?.pageInfo?.hasNextPage || false)

const prevPage = async () => {
  await mainRefetch({
    first: undefined,
    last: fetchCount,
    after: null,
    before: mainResult.value?.[queryName]?.pageInfo?.startCursor || null,
  })
}
const nextPage = async () => {
  await mainRefetch({
    first: fetchCount,
    last: undefined,
    before: null,
    after: mainResult.value?.[queryName]?.pageInfo?.endCursor || null,
  })
}
</script>
