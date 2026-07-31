<template>
  <div v-if="selectedChange">
    <Card class="m-3 border-0 bg-base-100 shadow-md">
      <CardHeader class="pb-2">
        <CardTitle class="flex justify-between">
          <span>Current Edits ({{ totalCount }})</span>
          <div class="flex justify-end gap-3">
            <Button :disabled="!hasPreviousPage" variant="outline" @click="prevPage">
              <ChevronLeft />
              Prev
            </Button>
            <Button :disabled="!hasNextPage" variant="outline" @click="nextPage">
              Next
              <ChevronRight />
            </Button>
          </div>
        </CardTitle>
        <CardDescription>{{ desc }}</CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          <ul class="list">
            <div
              v-for="n in nodes.filter((n: { changes?: { id?: string } }) => n.changes?.id)"
              :key="n.changes.id"
              class="flex items-center"
            >
              <div class="flex-1">
                <slot :node="n" />
              </div>
              <button class="btn btn-square btn-ghost" @click="confirmDiscard(n.changes.id)">
                <Undo2 />
              </button>
            </div>
          </ul>
        </div>
      </CardContent>
    </Card>

    <Dialog v-model:open="showConfirm">
      <DialogContent>
        <DialogTitle>Discard Edit</DialogTitle>
        <p class="text-sm text-base-content/70">
          Are you sure you want to discard this edit? This cannot be undone.
        </p>
        <DialogFooter>
          <Button variant="outline" @click="showConfirm = false">Cancel</Button>
          <Button variant="danger" @click="doDiscard">Discard</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import type { TypedDocumentNode } from '@graphql-typed-document-node/core'
import { ChevronLeft, ChevronRight, Undo2 } from '@lucide/vue'

import { graphql } from '~/gql'
import type { EditModelType } from '~/gql/graphql'

type CursorVars = {
  changeID: string
  type?: EditModelType
  first?: number
  last?: number
  before: string | null
  after: string | null
}
const { desc, query, type } = defineProps<{
  desc?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: TypedDocumentNode<Record<string, any>, CursorVars>
  type: EditModelType
}>()

const changeStore = useChangeStore()
const { selectedChange } = storeToRefs(changeStore)

const fetchCount = 10
const { result, refetch } = useQuery(
  query,
  (): CursorVars => ({
    changeID: selectedChange.value ?? '',
    type,
    first: fetchCount,
    last: undefined,
    after: null,
    before: null,
  }),
)
const nodes = computed(() => result.value?.change?.edits.nodes || [])
const totalCount = computed(() => result.value?.change?.edits.totalCount ?? 0)
const hasPreviousPage = computed(() => {
  return result.value?.change?.edits.pageInfo?.hasPreviousPage || false
})
const hasNextPage = computed(() => {
  return result.value?.change?.edits.pageInfo?.hasNextPage || false
})

const prevPage = async () => {
  await refetch({
    changeID: selectedChange.value || '',
    first: undefined,
    last: fetchCount,
    after: null,
    before: result.value?.change?.edits.pageInfo?.startCursor || null,
  })
}
const nextPage = async () => {
  await refetch({
    changeID: selectedChange.value || '',
    first: fetchCount,
    last: undefined,
    before: null,
    after: result.value?.change?.edits.pageInfo?.endCursor || null,
  })
}

const discardEditMutation = graphql(`
  mutation DiscardEditMutation($changeID: ID!, $editID: ID!) {
    discardEdit(changeID: $changeID, editID: $editID) {
      id
    }
  }
`)

const showConfirm = ref(false)
const pendingEditId = ref<string | null>(null)

const confirmDiscard = (editId: string) => {
  pendingEditId.value = editId
  showConfirm.value = true
}

const doDiscard = async () => {
  if (!pendingEditId.value) return
  const { mutate } = useMutation(discardEditMutation, {
    variables: {
      changeID: selectedChange.value || '',
      editID: pendingEditId.value,
    },
  })
  await mutate()
  showConfirm.value = false
  pendingEditId.value = null
}
</script>
