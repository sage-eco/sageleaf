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
                <div
                  class="text-md line-clamp-2 font-bold"
                  :class="{ 'font-normal opacity-60': displayTitle.muted }"
                >
                  {{ displayTitle.text }}
                </div>
              </TooltipTrigger>
              <TooltipContent>{{ displayTitle.text }}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <div v-else class="text-md grow opacity-70">No Change Selected</div>
      </button>
      <template v-if="!isChangeSelected">
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

    <div v-if="isChangeSelected" class="flex flex-col gap-2">
      <div v-if="result?.change?.description" class="line-clamp-2 w-full text-xs opacity-70">
        {{ result.change.description }}
      </div>

      <ButtonGroup class="w-full">
        <Button class="flex-1" @click.stop.prevent="selectionOpen = true">
          <ArrowLeftRight :size="16" />
          Switch
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <Button size="icon" title="Quick Actions" @click.stop.prevent>
              <ChevronDown :size="16" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom">
            <DropdownMenuItem
              v-for="action in quickActions"
              :key="action.key"
              @select="action.handler"
            >
              <component :is="action.icon" :size="16" />
              <span>{{ action.label }}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </ButtonGroup>
    </div>

    <SidebarChangeSummaryDialog v-model:open="summaryOpen" :change-id="selectedChange" />
    <SidebarChangeSelectionDialog v-model:open="selectionOpen" @select="onSelectChange" />
    <SidebarChangeNewDialog v-model:open="newChangeOpen" @created="onCreatedNew" />
  </div>
</template>

<script setup lang="ts">
import { ArrowLeftRight, ChevronDown, Plus } from '@lucide/vue'

import { graphql } from '~/gql'
import type { ChangeStatus } from '~/gql/graphql'

const changeStore = useChangeStore()
const { selectedChange, isChangeSelected } = storeToRefs(changeStore)
const { isAdmin } = useAuth()
const { requireAuth } = useRequireAuth()

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

const status = computed(() => result.value?.change?.status ?? null)
const { badgeClass: statusBadgeClass } = useChangeStatusDisplay(status)

const displayTitle = computed(() => {
  if (!result.value?.change) return { text: 'Loading...', muted: false }
  return result.value.change.title
    ? { text: result.value.change.title, muted: false }
    : { text: 'Unnamed Change', muted: true }
})

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
const { mutate: mergeChangeMut } = useMutation(mergeChangeMutation)

const onNew = () => requireAuth(() => useCreateBlankChange().createAndSwitch())

const onSetStatus = async (newStatus: ChangeStatus) => {
  if (!selectedChange.value) return
  await updateChangeMut({ input: { id: selectedChange.value, status: newStatus } })
  await refetch()
}

const onMerge = async () => {
  if (!selectedChange.value) return
  await mergeChangeMut({ id: selectedChange.value })
  await refetch()
}

const { actions: quickActions } = useChangeQuickActions(status, isAdmin, {
  onNew,
  onSetStatus,
  onMerge,
})

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

const onSelectChange = (id: string) => {
  changeStore.setChange(id)
}

const onCreatedNew = (id?: string) => {
  if (id) {
    changeStore.setChange(id)
  }
}
</script>
