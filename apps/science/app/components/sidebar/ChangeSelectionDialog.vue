<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[80vh] max-w-lg overflow-auto">
      <DialogHeader>
        <DialogTitle>Select a Change</DialogTitle>
      </DialogHeader>

      <div class="flex flex-col gap-4">
        <ul v-if="changes.length" class="list">
          <div v-for="change in changes" :key="change.id" class="list-item">
            <ModelListChange :change="change" :buttons="['select']" @button="onSelect" />
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
</template>

<script setup lang="ts">
import { graphql } from '~/gql'
import { ChangeStatus } from '~/gql/graphql'

const open = defineModel<boolean>('open', { required: true })
const emit = defineEmits<{ select: [id: string] }>()

const { sessionData: session } = useAuth()

const ChangeSidebarListQuery = graphql(`
  query ChangeSidebarListQuery($userID: ID) {
    changes(first: 50, userID: $userID) {
      nodes {
        ...ListChangeFragment
        id
        status
      }
    }
  }
`)

const { result, loading } = useQuery(ChangeSidebarListQuery, () => ({
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

const onSelect = (btn: string, id: string) => {
  if (btn === 'select') {
    emit('select', id)
    open.value = false
  }
}
</script>
