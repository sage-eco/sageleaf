<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[80vh] max-w-5xl! overflow-auto">
      <DialogHeader>
        <DialogTitle>Select a Change</DialogTitle>
      </DialogHeader>

      <div class="flex flex-col gap-4">
        <Button title="New change" @click="onNew">
          <Plus :size="16" />
          New
        </Button>
        <ul v-if="changes.length" class="list">
          <div v-for="change in changes" :key="change.id" class="list-item">
            <ModelListChange
              :change="change"
              :buttons="['delete']"
              :on-row-click="() => onSelect(change.id)"
              @button="onButton"
            />
          </div>
        </ul>
        <div v-else-if="!loading" class="py-4 text-center text-sm opacity-60">
          No in-progress changes
        </div>
        <div v-if="loading" class="flex justify-center py-4">
          <span class="loading loading-spinner" />
        </div>
      </div>
    </DialogContent>
  </Dialog>

  <SidebarChangeDeleteDialog
    v-model:open="deleteOpen"
    :title="deleteTitle"
    @confirm="onDeleteConfirm"
  />
</template>

<script setup lang="ts">
import { Plus } from '@lucide/vue'

import { graphql } from '~/gql'
import { ChangeStatus } from '~/gql/graphql'

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ select: [id: string] }>()

const { sessionData: session } = useAuth()
const { requireAuth } = useRequireAuth()
const changeStore = useChangeStore()
const { selectedChange } = storeToRefs(changeStore)

const ChangeSidebarListQuery = graphql(`
  query ChangeSidebarListQuery($userID: ID) {
    changes(first: 50, userID: $userID) {
      nodes {
        ...ListChangeFragment
        id
        title
        status
      }
    }
  }
`)

const { result, loading, refetch } = useQuery(ChangeSidebarListQuery, () => ({
  userID: session.value?.data?.user?.id ?? null,
}))

const changes = computed(() => {
  const nodes = result.value?.changes?.nodes ?? []
  return nodes.filter(
    (c) =>
      c.status === ChangeStatus.Draft ||
      c.status === ChangeStatus.Proposed ||
      c.status === ChangeStatus.Approved,
  )
})

const deleteChangeMutation = graphql(`
  mutation DeleteChangeFromSelectionDialog($id: ID!) {
    deleteChange(id: $id) {
      success
    }
  }
`)

const { mutate: deleteChangeMut } = useMutation(deleteChangeMutation)

const onSelect = (id: string) => {
  emit('select', id)
  open.value = false
}

const onNew = () => {
  requireAuth(async () => {
    await useCreateBlankChange().createAndSwitch()
    open.value = false
  })
}

const deleteOpen = ref(false)
const deleteTargetId = ref<string | null>(null)
const deleteTitle = computed(
  () => changes.value.find((c) => c.id === deleteTargetId.value)?.title ?? undefined,
)

const onButton = (btn: string, id: string) => {
  if (btn === 'delete') {
    deleteTargetId.value = id
    deleteOpen.value = true
  }
}

const onDeleteConfirm = async () => {
  const id = deleteTargetId.value
  if (!id) return
  await deleteChangeMut({ id })
  if (selectedChange.value === id) {
    changeStore.setChange(undefined)
  }
  await refetch()
}
</script>
