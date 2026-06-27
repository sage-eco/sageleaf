<template>
  <div>
    <div class="p-3">
      <Button
        @click="
          requireAuth(() => {
            editId = 'new'
            showEdit = true
          })
        "
      >
        <Plus />
        Add Change
      </Button>
    </div>
    <Card class="m-3 border-0 bg-base-100 shadow-md">
      <CardHeader>
        <CardTitle>Changes</CardTitle>
        <CardDescription></CardDescription>
      </CardHeader>
      <CardContent>
        <ul v-if="changes" class="list">
          <div v-for="(change, i) in changes" :key="i" class="list-item">
            <ModelListChange
              :change="change"
              :on-row-click="
                () => panelStore.openPanel('change', (change as ListChangeFragmentFragment).id)
              "
              :buttons="visibleButtons(change as ListChangeFragmentFragment)"
              @button="selectChange"
            />
          </div>
        </ul>
      </CardContent>
    </Card>
    <Dialog v-model:open="showEdit">
      <DialogContent class="max-h-[80vh] overflow-auto">
        <DialogTitle>
          <span v-if="editId === 'new'">Create Change</span>
          <span v-else>Edit Change</span>
        </DialogTitle>
        <FormChangeNew />
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { Plus } from '@lucide/vue'

import { graphql } from '~/gql'
import type { ListChangeFragmentFragment } from '~/gql/graphql'
import { ChangeStatus } from '~/gql/types.generated'
import { useDetailPanelStore } from '~/stores/detail_panel_store'

const { setChange } = useChangeStore()
const { requireAuth } = useRequireAuth()
const panelStore = useDetailPanelStore()

const deleteChangeMutation = graphql(`
  mutation DeleteChangeFromList($id: ID!) {
    deleteChange(id: $id) {
      success
    }
  }
`)
const { mutate: deleteChange } = useMutation(deleteChangeMutation)

const selectChange = async (btn: string, id: string) => {
  if (btn === 'select') {
    setChange(id)
  } else if (btn === 'edit') {
    editId.value = id
    showEdit.value = true
  } else if (btn === 'delete') {
    await deleteChange({ id })
    await refetch()
  }
}

const changesQuery = graphql(`
  query ChangesQuery($first: Int, $last: Int, $before: String, $after: String) {
    changes(first: $first, last: $last, before: $before, after: $after) {
      nodes {
        ...ListChangeFragment
      }
      pageInfo {
        hasPreviousPage
        hasNextPage
        startCursor
        endCursor
      }
    }
  }
`)
const { result: changesData, refetch } = useQuery(changesQuery)
const changes = computed(() => changesData.value?.changes?.nodes || [])

const _createChangeMutation = graphql(`
  mutation CreateChange($input: CreateChangeInput!) {
    createChange(input: $input) {
      change {
        id
      }
    }
  }
`)
const _updateChangeMutation = graphql(`
  mutation UpdateChange($input: UpdateChangeInput!) {
    updateChange(input: $input) {
      change {
        id
      }
    }
  }
`)

const showEdit = ref(false)
const editId = ref<string>('new')

const visibleButtons = (change: ListChangeFragmentFragment): ('select' | 'edit' | 'delete')[] => {
  if (change.status === ChangeStatus.Merged || change.status === ChangeStatus.Rejected) {
    return ['edit']
  }
  return ['select', 'edit', 'delete']
}
</script>
