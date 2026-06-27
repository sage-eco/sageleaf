<template>
  <div class="flex min-h-0 min-w-0 flex-1 flex-col">
    <!-- Search input -->
    <div class="border-b border-base-content/10 px-4 py-3">
      <div class="relative flex items-center gap-2">
        <div class="relative flex flex-1 items-center">
          <SearchIcon :size="16" class="absolute left-3 shrink-0 opacity-40" />
          <FormInput v-model="searchInput" placeholder="Search…" class="pl-9" />
          <Button
            v-if="searchInput"
            variant="ghost"
            size="icon"
            class="absolute right-1 h-7 w-7 opacity-40 hover:opacity-80"
            @click="searchInput = ''"
          >
            <XIcon :size="14" />
          </Button>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button variant="outline" size="sm" class="shrink-0 gap-1.5">
              <ListFilterIcon :size="14" />
              Type
              <span
                v-if="selectedTypes.size < typeOptions.length"
                class="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-content"
              >
                {{ selectedTypes.size }}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" class="w-40">
            <DropdownMenuCheckboxItem
              v-for="opt in typeOptions"
              :key="opt.value"
              :checked="selectedTypes.has(opt.value)"
              @update:checked="(v: boolean | 'indeterminate') => toggleType(opt.value, v)"
            >
              {{ opt.label }}
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <!-- Bulk bar -->
    <div
      v-if="selectedIds.size > 0"
      class="sticky top-0 z-10 flex items-center gap-3 border-b border-base-content/10 bg-primary/10 px-4 py-2 text-sm"
    >
      <span class="font-medium">{{ selectedIds.size }} selected</span>
      <Button variant="ghost" size="sm" @click="selectedIds = new Set()">Clear</Button>
    </div>

    <!-- Results -->
    <div class="flex-1 overflow-y-auto">
      <!-- Loading -->
      <div v-if="loading" class="flex flex-col gap-1 p-3">
        <div v-for="i in 8" :key="i" class="flex items-center gap-4 rounded-lg px-3 py-3">
          <div class="size-4 skeleton rounded" />
          <div class="size-11 shrink-0 skeleton rounded-lg" />
          <div class="flex flex-1 flex-col gap-2">
            <div class="h-3.5 w-28 skeleton rounded" />
            <div class="h-3 w-48 skeleton rounded" />
          </div>
        </div>
      </div>

      <!-- Result rows -->
      <div v-else-if="results.length > 0" class="p-3">
        <div
          v-if="totalCount"
          class="px-3 pt-0.5 pb-1.5 text-xs tracking-wide text-base-content/40"
        >
          {{ totalCount }} result{{ totalCount !== 1 ? 's' : '' }}
        </div>
        <ul class="flex flex-col gap-0.5">
          <template v-for="item in results" :key="item.id">
            <ModelListCategory
              v-if="item.__typename === 'Category'"
              :category="item"
              :on-row-click="() => handleRowClick('Category', item.id)"
            >
              <template #leading>
                <FormCheckbox
                  :checked="selectedIds.has(item.id)"
                  @update:checked="(v: boolean | 'indeterminate') => toggleSelected(item.id, v)"
                  @click.stop
                />
              </template>
            </ModelListCategory>

            <ModelListItem
              v-else-if="item.__typename === 'Item'"
              :item="item"
              :on-row-click="() => handleRowClick('Item', item.id)"
            >
              <template #leading>
                <FormCheckbox
                  :checked="selectedIds.has(item.id)"
                  @update:checked="(v: boolean | 'indeterminate') => toggleSelected(item.id, v)"
                  @click.stop
                />
              </template>
            </ModelListItem>

            <ModelListVariant
              v-else-if="item.__typename === 'Variant'"
              :variant="item"
              :on-row-click="() => handleRowClick('Variant', item.id)"
            >
              <template #leading>
                <FormCheckbox
                  :checked="selectedIds.has(item.id)"
                  @update:checked="(v: boolean | 'indeterminate') => toggleSelected(item.id, v)"
                  @click.stop
                />
              </template>
            </ModelListVariant>

            <ModelListComponent
              v-else-if="item.__typename === 'Component'"
              :component="item"
              :on-row-click="() => handleRowClick('Component', item.id)"
            >
              <template #leading>
                <FormCheckbox
                  :checked="selectedIds.has(item.id)"
                  @update:checked="(v: boolean | 'indeterminate') => toggleSelected(item.id, v)"
                  @click.stop
                />
              </template>
            </ModelListComponent>

            <ModelListOrg
              v-else-if="item.__typename === 'Org'"
              :org="item"
              :on-row-click="() => handleRowClick('Org', item.id)"
            >
              <template #leading>
                <FormCheckbox
                  :checked="selectedIds.has(item.id)"
                  @update:checked="(v: boolean | 'indeterminate') => toggleSelected(item.id, v)"
                  @click.stop
                />
              </template>
            </ModelListOrg>

            <ModelListPlace
              v-else-if="item.__typename === 'Place'"
              :place="item"
              :on-row-click="() => handleRowClick('Place', item.id)"
            >
              <template #leading>
                <FormCheckbox
                  :checked="selectedIds.has(item.id)"
                  @update:checked="(v: boolean | 'indeterminate') => toggleSelected(item.id, v)"
                  @click.stop
                />
              </template>
            </ModelListPlace>

            <ModelListMaterial
              v-else-if="item.__typename === 'Material'"
              :material="item"
              :on-row-click="() => handleRowClick('Material', item.id)"
            >
              <template #leading>
                <FormCheckbox
                  :checked="selectedIds.has(item.id)"
                  @update:checked="(v: boolean | 'indeterminate') => toggleSelected(item.id, v)"
                  @click.stop
                />
              </template>
            </ModelListMaterial>

            <ModelListRegion v-else-if="item.__typename === 'Region'" :region="item">
              <template #leading>
                <FormCheckbox
                  :checked="selectedIds.has(item.id)"
                  @update:checked="(v: boolean | 'indeterminate') => toggleSelected(item.id, v)"
                  @click.stop
                />
              </template>
            </ModelListRegion>
          </template>
        </ul>
      </div>

      <!-- No results -->
      <div
        v-else-if="debouncedSearch.length >= 2 && !loading"
        class="flex flex-col items-center justify-center gap-3 py-16 text-base-content/40"
      >
        <SearchXIcon :size="32" />
        <p class="text-sm">
          No results for <strong>"{{ debouncedSearch }}"</strong>
        </p>
      </div>

      <!-- Empty state -->
      <div
        v-else
        class="flex flex-col items-center justify-center gap-3 py-16 text-base-content/30"
      >
        <SearchIcon :size="32" />
        <p class="text-sm">Type to search</p>
      </div>
    </div>

    <!-- Pagination -->
    <div
      v-if="totalCount > limit"
      class="sticky bottom-0 flex items-center justify-between border-t border-base-content/10 bg-base-100 px-4 py-3 text-sm"
    >
      <Button
        variant="ghost"
        size="sm"
        :disabled="offset === 0"
        @click="offset = Math.max(0, offset - limit)"
      >
        Previous
      </Button>
      <span class="text-base-content/50">
        {{ offset + 1 }}–{{ Math.min(offset + results.length, totalCount) }} of {{ totalCount }}
      </span>
      <Button
        variant="ghost"
        size="sm"
        :disabled="offset + results.length >= totalCount"
        @click="offset += limit"
      >
        Next
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ListFilterIcon, SearchIcon, SearchXIcon, XIcon } from '@lucide/vue'
import { watchDebounced } from '@vueuse/core'

import { graphql } from '~/gql'
import type { SearchType } from '~/gql/graphql'
import { useDetailPanelStore } from '~/stores/detail_panel_store'

const route = useRoute()
const router = useRouter()
const panelStore = useDetailPanelStore()

const LIMIT = 50
const limit = LIMIT

const typeOptions = [
  { label: 'Category', value: 'CATEGORY' },
  { label: 'Item', value: 'ITEM' },
  { label: 'Variant', value: 'VARIANT' },
  { label: 'Component', value: 'COMPONENT' },
  { label: 'Org', value: 'ORG' },
  { label: 'Place', value: 'PLACE' },
  { label: 'Material', value: 'MATERIAL' },
  { label: 'Region', value: 'REGION' },
]

const selectedTypes = ref<Set<string>>(new Set(typeOptions.map((o) => o.value)))
const searchInput = ref((route.query.q as string) || '')
const debouncedSearch = ref((route.query.q as string) || '')
const offset = ref(0)
const selectedIds = ref<Set<string>>(new Set())

watch(searchInput, (val) => {
  router.replace({ query: val ? { q: val } : {} })
})

watchDebounced(
  searchInput,
  (val) => {
    debouncedSearch.value = val
    offset.value = 0
  },
  { debounce: 300 },
)

watch(selectedTypes, () => {
  offset.value = 0
})

function toggleType(value: string, checked: boolean | 'indeterminate') {
  if (checked) {
    selectedTypes.value.add(value)
  } else {
    selectedTypes.value.delete(value)
  }
  selectedTypes.value = new Set(selectedTypes.value)
}

function toggleSelected(id: string, checked: boolean | 'indeterminate') {
  if (checked) {
    selectedIds.value.add(id)
  } else {
    selectedIds.value.delete(id)
  }
  selectedIds.value = new Set(selectedIds.value)
}

const searchQuery = graphql(`
  query DashboardSearch($query: String!, $types: [SearchType!], $limit: Int, $offset: Int) {
    search(query: $query, types: $types, limit: $limit, offset: $offset) {
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
          ...ListRegionFragment
        }
      }
      totalCount
    }
  }
`)

const { result, loading } = useQuery(
  searchQuery,
  () => ({
    query: debouncedSearch.value,
    types: selectedTypes.value.size > 0 ? ([...selectedTypes.value] as SearchType[]) : undefined,
    limit: LIMIT,
    offset: offset.value,
  }),
  () => ({ enabled: debouncedSearch.value.length >= 2 }),
)

const results = computed(() => result.value?.search.nodes ?? [])
const totalCount = computed(() => result.value?.search.totalCount ?? 0)

const panelTypeMap: Record<string, string> = {
  Category: 'category',
  Item: 'item',
  Variant: 'variant',
  Component: 'component',
  Org: 'org',
  Place: 'place',
  Material: 'material',
}

function handleRowClick(typename: string, id: string) {
  const panelType = panelTypeMap[typename]
  if (panelType) {
    panelStore.openPanel(panelType, id)
  }
}
</script>
