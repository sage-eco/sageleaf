<template>
  <Dialog v-model:open="open">
    <DialogTrigger as-child>
      <Button variant="outline">
        <Copy />
        Copy {{ label }}
      </Button>
    </DialogTrigger>
    <DialogContent class="sm:max-w-[500px]">
      <DialogTitle>Copy {{ label }}</DialogTitle>

      <!-- Search mode: entityType provided -->
      <template v-if="entityType">
        <div class="flex items-center gap-2 border-b border-base-content/10 pb-3">
          <SearchIcon :size="16" class="shrink-0 opacity-40" />
          <FormInput
            v-model="searchInput"
            :placeholder="`Search ${label}s…`"
            class="flex-1 bg-transparent py-1 text-sm text-base-content outline-none placeholder:opacity-40"
            autofocus
          />
          <button
            v-if="searchInput"
            class="shrink-0 rounded p-1 opacity-40 transition hover:opacity-80"
            @click="searchInput = ''"
          >
            <XIcon :size="14" />
          </button>
        </div>

        <div class="max-h-80 overflow-y-auto">
          <div v-if="searchLoading" class="flex flex-col gap-1 py-2">
            <div v-for="i in 4" :key="i" class="flex items-center gap-3 rounded-lg px-2 py-2">
              <div class="size-8 shrink-0 skeleton rounded" />
              <div class="h-3.5 w-32 skeleton rounded" />
            </div>
          </div>

          <div v-else-if="searchResults.length" class="flex flex-col gap-0.5 py-1">
            <button
              v-for="item in searchResults"
              :key="item.id"
              class="flex items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-base-200 disabled:opacity-50"
              :disabled="loadingCopy"
              @click="selectItem(item.id)"
            >
              <div
                class="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded border border-base-content/10 bg-base-200"
              >
                <UiImage
                  v-if="item.imageURL"
                  :src="item.imageURL"
                  :width="8"
                  :height="8"
                  class="size-8"
                />
                <BoxIcon v-else :size="14" class="opacity-30" />
              </div>
              <span class="truncate text-sm font-medium">{{ item.name ?? item.id }}</span>
              <LoaderCircle
                v-if="loadingCopy && pendingId === item.id"
                :size="14"
                class="ml-auto animate-spin opacity-50"
              />
            </button>
          </div>

          <div
            v-else-if="debouncedSearch.length >= 2"
            class="py-10 text-center text-sm text-base-content/40"
          >
            No results for "{{ debouncedSearch }}"
          </div>

          <div v-else class="py-10 text-center text-sm text-base-content/30">
            Type to search {{ label }}s
          </div>
        </div>
      </template>

      <!-- ID input mode: no entityType, paste an ID -->
      <template v-else>
        <p class="text-sm text-base-content/60">Paste the ID of the {{ label }} to copy from.</p>
        <div class="flex gap-2 pt-1">
          <FormInput
            v-model="pastedId"
            type="text"
            placeholder="Entity ID…"
            autofocus
            @keydown.enter="pastedId && selectItem(pastedId)"
          />
          <Button :disabled="!pastedId || loadingCopy" @click="pastedId && selectItem(pastedId)">
            <LoaderCircle v-if="loadingCopy" :size="14" class="animate-spin" />
            <span v-else>Copy</span>
          </Button>
        </div>
        <p v-if="errorMsg" class="text-sm text-error">{{ errorMsg }}</p>
      </template>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { BoxIcon, Copy, LoaderCircle, SearchIcon, XIcon } from '@lucide/vue'
import { watchDebounced } from '@vueuse/core'

import { graphql } from '~/gql'
import type { SearchType } from '~/gql/graphql'

const { entityType, entityName, label } = defineProps<{
  entityType?: string
  entityName: string
  label: string
}>()

const emit = defineEmits<{
  (e: 'selected', copyInput: Record<string, unknown>): void
}>()

const open = ref(false)
const searchInput = ref('')
const debouncedSearch = ref('')
const pastedId = ref('')
const pendingId = ref<string | null>(null)
const loadingCopy = ref(false)
const errorMsg = ref<string | null>(null)

watch(open, (isOpen) => {
  if (!isOpen) {
    searchInput.value = ''
    debouncedSearch.value = ''
    pastedId.value = ''
    pendingId.value = null
    loadingCopy.value = false
    errorMsg.value = null
  }
})

watchDebounced(searchInput, (val) => (debouncedSearch.value = val), { debounce: 300 })

// ── Search query (search mode only) ─────────────────────────────────────────

const copySearchQuery = graphql(`
  query CopyEntitySearch($query: String!, $type: SearchType!) {
    search(query: $query, types: [$type]) {
      nodes {
        __typename
        ... on Category {
          id
          name_req: name
          imageURL
        }
        ... on Item {
          id
          name
          imageURL
        }
        ... on Variant {
          id
          name
          imageURL
        }
        ... on Component {
          id
          name
          imageURL
        }
        ... on Org {
          id
          name_req: name
          avatarURL
        }
        ... on Place {
          id
          name
        }
      }
    }
  }
`)

type SearchNode = { id: string; name?: string | null; imageURL?: string | null }

const { result: searchData, loading: searchLoading } = useQuery(
  copySearchQuery,
  () => ({ query: debouncedSearch.value, type: entityType as SearchType }),
  () => ({ enabled: !!entityType && debouncedSearch.value.length >= 2 }),
)

const searchResults = computed<SearchNode[]>(() => {
  if (!entityType) return []
  const nodes = searchData.value?.search?.nodes ?? []
  return nodes
    .filter(
      (n): n is NonNullable<typeof n> & { id: string } =>
        !!n && 'id' in n && typeof (n as Record<string, unknown>).id === 'string',
    )
    .map((n) => ({
      id: n.id,
      name:
        ('name_req' in n ? (n.name_req as string | null) : null) ??
        ('name' in n ? (n.name as string | null) : null),
      imageURL:
        ('imageURL' in n ? (n.imageURL as string | null) : null) ??
        ('avatarURL' in n ? (n.avatarURL as string | null) : null),
    }))
})

// ── DirectEdit copyInput query ───────────────────────────────────────────────

const copyInputQuery = graphql(`
  query CopyEntityDirectEdit($id: ID!, $entityName: String!) {
    directEdit(id: $id, entityName: $entityName) {
      copyInput
    }
  }
`)

const { load: loadCopyInput, onResult, onError } = useLazyQuery(copyInputQuery)

onResult((result) => {
  const copyInput = result.data?.directEdit?.copyInput
  if (copyInput) {
    emit('selected', copyInput as Record<string, unknown>)
    open.value = false
  } else {
    errorMsg.value = `No copy data found for this ${label}.`
  }
  loadingCopy.value = false
  pendingId.value = null
})

onError(() => {
  errorMsg.value = `Failed to load copy data. Check that the ID is valid.`
  loadingCopy.value = false
  pendingId.value = null
})

const selectItem = (id: string) => {
  if (!id) return
  loadingCopy.value = true
  pendingId.value = id
  errorMsg.value = null
  loadCopyInput(null, { id, entityName })
}
</script>
