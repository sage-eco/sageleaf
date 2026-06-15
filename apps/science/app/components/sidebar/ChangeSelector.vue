<template>
  <div class="flex min-h-16 w-full items-center">
    <button
      class="flex min-w-0 grow cursor-pointer items-center gap-2 text-left"
      type="button"
      @click="openDialog"
    >
      <div v-if="isChangeSelected" class="min-w-0 grow">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <div class="text-md line-clamp-2 font-bold">
                {{ result?.change?.title || 'Loading...' }}
              </div>
            </TooltipTrigger>
            <TooltipContent>{{ result?.change?.title }}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div class="line-clamp-1 text-sm opacity-70">
          {{ result?.change?.description || '' }}
        </div>
      </div>
      <div v-else class="text-md grow opacity-70">No Change Selected</div>
    </button>
    <Button v-if="selectedChange" variant="ghost" size="sm" @click.stop.prevent="clearChange">
      <X :size="16" />
    </Button>

    <Dialog v-model:open="dialogOpen">
      <DialogContent class="max-h-[80vh] max-w-lg overflow-auto">
        <DialogHeader>
          <DialogTitle>Select a Change</DialogTitle>
        </DialogHeader>

        <div class="flex flex-col gap-4">
          <Button variant="outline" size="sm" class="self-start" @click="showCreate = true">
            <Plus :size="16" />
            New Change
          </Button>

          <ul v-if="changes.length" class="list">
            <div v-for="(change, i) in changes" :key="i" class="list-item">
              <ModelListChange
                :change="change"
                :buttons="visibleButtons(change as ListChangeFragmentFragment)"
                @button="onButton"
              />
            </div>
          </ul>
          <div v-else-if="!changesLoading" class="py-4 text-center text-sm opacity-60">
            No changes found
          </div>
          <div v-if="changesLoading" class="flex justify-center py-4">
            <span class="loading loading-spinner" />
          </div>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showCreate">
      <DialogContent class="max-h-[80vh] max-w-lg overflow-auto">
        <DialogHeader>
          <DialogTitle>New Change</DialogTitle>
        </DialogHeader>
        <FormChangeNew @created="onCreated" />
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { Plus, X } from '@lucide/vue'

import { graphql } from '~/gql'
import type { ListChangeFragmentFragment } from '~/gql/graphql'
import { ChangeStatus } from '~/gql/types.generated'

const changeStore = useChangeStore()
const { selectedChange, isChangeSelected } = storeToRefs(changeStore)

// ── Current change display ─────────────────────────────────────────────────────

const ChangeSelectorQuery = graphql(`
  query ChangeSelector($id: ID!) {
    change(id: $id) {
      id
      title
      description
    }
  }
`)
const { result, load, refetch } = useLazyQuery(ChangeSelectorQuery, {
  id: selectedChange.value || '',
})
watch(
  selectedChange,
  async (newId) => {
    if (newId) {
      await (load(ChangeSelectorQuery, { id: newId }) || refetch({ id: newId }))
    }
  },
  { immediate: true },
)

const clearChange = () => {
  changeStore.setChange(undefined)
}

// ── Dialog ─────────────────────────────────────────────────────────────────────

const dialogOpen = ref(false)
const showCreate = ref(false)

const openDialog = () => {
  showCreate.value = false
  dialogOpen.value = true
}

// ── Changes list ───────────────────────────────────────────────────────────────

const changesQuery = graphql(`
  query ChangeSelectorListQuery {
    changes(first: 50) {
      nodes {
        ...ListChangeFragment
      }
    }
  }
`)
const { result: changesData, loading: changesLoading } = useQuery(changesQuery)
const changes = computed(() => changesData.value?.changes?.nodes ?? [])

const visibleButtons = (change: ListChangeFragmentFragment): ('select' | 'edit')[] => {
  if (change.status === ChangeStatus.Merged || change.status === ChangeStatus.Rejected) {
    return ['edit']
  }
  return ['select', 'edit']
}

const onButton = (btn: string, id: string) => {
  if (btn === 'select') {
    changeStore.setChange(id)
    dialogOpen.value = false
  }
}

const onCreated = (id?: string) => {
  showCreate.value = false
  if (id) {
    changeStore.setChange(id)
    dialogOpen.value = false
  }
}
</script>
