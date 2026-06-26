<template>
  <div class="flex min-h-16 w-full flex-col gap-2">
    <div class="flex w-full items-center gap-2">
      <button
        class="flex min-w-0 grow cursor-pointer items-center text-left"
        type="button"
        @click="onMainClick"
      >
        <div v-if="isChangeSelected" class="min-w-0 grow">
          <span v-if="result?.change?.status" class="badge badge-sm" :class="statusBadgeClass">
            {{ result.change.status }}
          </span>
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
        </div>
        <div v-else class="text-md grow opacity-70">No Change Selected</div>
      </button>
      <template v-if="isChangeSelected">
        <Button
          variant="ghost"
          size="sm"
          title="Switch change"
          @click.stop.prevent="selectionOpen = true"
        >
          <ArrowLeftRight :size="16" />
        </Button>
        <Button variant="ghost" size="sm" title="Clear change" @click.stop.prevent="clearChange">
          <X :size="16" />
        </Button>
      </template>
      <template v-else>
        <Button
          variant="ghost"
          size="sm"
          title="New change"
          @click.stop.prevent="newChangeOpen = true"
        >
          <Plus :size="16" />
        </Button>
      </template>
    </div>

    <div v-if="isChangeSelected" class="flex flex-wrap items-center gap-1">
      <div v-if="result?.change?.description" class="line-clamp-2 w-full text-xs opacity-70">
        {{ result.change.description }}
      </div>
      <DropdownMenu v-if="statusActions.length">
        <DropdownMenuTrigger as-child>
          <Button variant="outline" size="sm">
            <ChevronDown :size="16" />
            {{ statusLabel }}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="bottom">
          <DropdownMenuItem
            v-for="action in statusActions"
            :key="action.label"
            @select="onStatusAction(action.status, action.merge)"
          >
            <component :is="action.icon" :size="16" />
            <span>{{ action.label }}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button variant="outline" size="icon" title="Edit" @click.stop.prevent="openEdit">
        <Pencil :size="16" />
      </Button>
      <Button variant="destructive" size="icon" title="Delete" @click.stop.prevent="openDelete">
        <Trash2 :size="16" />
      </Button>
    </div>

    <SidebarChangeSummaryDialog v-model:open="summaryOpen" :change-id="selectedChange" />
    <SidebarChangeSelectionDialog v-model:open="selectionOpen" @select="onSelectChange" />
    <SidebarChangeNewDialog v-model:open="newChangeOpen" @created="onCreatedNew" />
    <SidebarChangeEditDialog
      v-model:open="editOpen"
      :initial-title="changeTitle"
      :initial-description="changeDescription"
      @save="onEditSave"
    />
    <SidebarChangeDeleteDialog v-model:open="deleteOpen" :title="changeTitle" @confirm="onDelete" />
  </div>
</template>

<script setup lang="ts">
import {
  ArrowLeftRight,
  ChevronDown,
  GitMerge,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Trash2,
  X,
} from '@lucide/vue'

import { graphql } from '~/gql'
import { ChangeStatus } from '~/gql/graphql'

const changeStore = useChangeStore()
const { selectedChange, isChangeSelected } = storeToRefs(changeStore)

const ChangeSidebarQuery = graphql(`
  query ChangeSidebarQuery($id: ID!) {
    change(id: $id) {
      id
      title
      description
      status
    }
  }
`)

const { result, refetch } = useQuery(ChangeSidebarQuery, () => ({ id: selectedChange.value ?? '' }))

const changeTitle = computed(() => result.value?.change?.title ?? undefined)
const changeDescription = computed(() => result.value?.change?.description ?? undefined)

const updateChangeMutation = graphql(`
  mutation UpdateChangeFromSidebar($input: UpdateChangeInput!) {
    updateChange(input: $input) {
      change {
        id
        title
        description
        status
      }
    }
  }
`)

const deleteChangeMutation = graphql(`
  mutation DeleteChangeFromSidebar($id: ID!) {
    deleteChange(id: $id) {
      success
    }
  }
`)

const mergeChangeMutation = graphql(`
  mutation MergeChangeFromSidebar($id: ID!) {
    mergeChange(id: $id) {
      change {
        id
        status
      }
    }
  }
`)

const { mutate: updateChangeMut } = useMutation(updateChangeMutation)
const { mutate: deleteChangeMut } = useMutation(deleteChangeMutation)
const { mutate: mergeChangeMut } = useMutation(mergeChangeMutation)

const statusBadgeClass = computed(() => {
  switch (result.value?.change?.status) {
    case ChangeStatus.Draft:
      return 'badge-warning'
    case ChangeStatus.Proposed:
      return 'badge-info'
    case ChangeStatus.Approved:
      return 'badge-success'
    case ChangeStatus.Merged:
      return 'badge-primary'
    case ChangeStatus.Rejected:
      return 'badge-error'
    default:
      return 'badge-outline'
  }
})

const statusLabel = computed(() => {
  switch (result.value?.change?.status) {
    case ChangeStatus.Draft:
    case ChangeStatus.Proposed:
      return 'Propose'
    case ChangeStatus.Approved:
      return 'Merge'
    default:
      return 'Status'
  }
})

interface StatusAction {
  status: ChangeStatus
  label: string
  icon: typeof Send
  merge?: boolean
}

const statusActions = computed<StatusAction[]>(() => {
  switch (result.value?.change?.status) {
    case ChangeStatus.Draft:
      return [{ status: ChangeStatus.Proposed, label: 'Propose', icon: Send }]
    case ChangeStatus.Proposed:
      return [
        { status: ChangeStatus.Draft, label: 'Back to Draft', icon: RotateCcw },
        { status: ChangeStatus.Approved, label: 'Approve', icon: Send },
      ]
    case ChangeStatus.Approved:
      return [
        { status: ChangeStatus.Merged, label: 'Merge', icon: GitMerge, merge: true },
        { status: ChangeStatus.Draft, label: 'Back to Draft', icon: RotateCcw },
      ]
    default:
      return []
  }
})

const clearChange = () => changeStore.setChange(undefined)

const onMainClick = () => {
  if (isChangeSelected.value) {
    summaryOpen.value = true
  } else {
    selectionOpen.value = true
  }
}

const summaryOpen = ref(false)
const selectionOpen = ref(false)
const newChangeOpen = ref(false)
const editOpen = ref(false)
const deleteOpen = ref(false)

const onSelectChange = (id: string) => {
  changeStore.setChange(id)
}

const onCreatedNew = (id?: string) => {
  if (id) {
    changeStore.setChange(id)
  }
}

const openEdit = () => {
  editOpen.value = true
}

const openDelete = () => {
  deleteOpen.value = true
}

const onEditSave = async ({ title, description }: { title: string; description: string }) => {
  if (!selectedChange.value) return
  await updateChangeMut({
    input: { id: selectedChange.value, title, description },
  })
  await refetch()
}

const onDelete = async () => {
  if (!selectedChange.value) return
  await deleteChangeMut({ id: selectedChange.value })
  clearChange()
}

const onStatusAction = async (status: ChangeStatus, merge?: boolean) => {
  if (!selectedChange.value) return
  if (merge) {
    await mergeChangeMut({ id: selectedChange.value })
  } else {
    await updateChangeMut({ input: { id: selectedChange.value, status } })
  }
  await refetch()
}
</script>
