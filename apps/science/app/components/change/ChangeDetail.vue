<template>
  <div>
    <div class="flex items-start gap-3 p-3">
      <Button v-if="mode === 'page'" variant="ghost" @click="emit('close')">
        <ArrowLeft class="size-4" />
      </Button>
      <template v-else>
        <Button variant="ghost" size="icon" @click="emit('close')">
          <X class="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          @click="
            () => {
              emit('close')
              navigateTo(`/changes/${id}`)
            }
          "
        >
          <Maximize2 class="size-4" />
        </Button>
      </template>
      <div class="flex-1">
        <h1 class="text-xl font-bold">{{ entity?.title ?? id }}</h1>
        <EntityMeta
          v-if="entity"
          :id="entity.id"
          :created-at="entity.createdAt"
          :updated-at="entity.updatedAt"
        />
      </div>
      <template v-if="mode === 'page'">
        <Button @click="requireAuth(() => (showEdit = true))">
          <Pencil class="size-4" />
          Edit
        </Button>
        <Button variant="destructive" @click="requireAuth(() => (showDelete = true))">
          <Trash2 class="size-4" />
          Delete
        </Button>
      </template>
    </div>

    <div v-if="entity">
      <div
        class="mx-3 mb-3 flex items-center gap-3 rounded-lg border px-4 py-3"
        :class="{
          'border-primary/30 bg-primary/10': entity.status === ChangeStatus.Merged,
          'border-info/30 bg-info/10': entity.status === ChangeStatus.Proposed,
          'border-success/30 bg-success/10': entity.status === ChangeStatus.Approved,
          'border-warning/30 bg-warning/10': entity.status === ChangeStatus.Draft,
          'border-error/30 bg-error/10': entity.status === ChangeStatus.Rejected,
        }"
      >
        <span
          class="badge badge-md font-semibold"
          :class="{
            'badge-primary': entity.status === ChangeStatus.Merged,
            'badge-info': entity.status === ChangeStatus.Proposed,
            'badge-success': entity.status === ChangeStatus.Approved,
            'badge-warning': entity.status === ChangeStatus.Draft,
            'badge-error': entity.status === ChangeStatus.Rejected,
          }"
          >{{ entity.status }}</span
        >
        <div class="flex-1 text-sm opacity-60">
          <span v-if="entity.status === ChangeStatus.Draft">Ready to propose for review</span>
          <span v-else-if="entity.status === ChangeStatus.Proposed">Awaiting approval</span>
          <span v-else-if="entity.status === ChangeStatus.Approved"
            >Approved and ready to merge</span
          >
          <span v-else-if="entity.status === ChangeStatus.Rejected">This change was rejected</span>
          <span v-else-if="entity.status === ChangeStatus.Merged">This change has been merged</span>
        </div>
        <template v-if="entity.status === ChangeStatus.Draft">
          <Button @click="requireAuth(() => doSetStatus(ChangeStatus.Proposed))">
            <Send class="size-4" />
            Propose
          </Button>
        </template>
        <template v-else-if="entity.status === ChangeStatus.Proposed">
          <Button variant="outline" @click="requireAuth(() => doSetStatus(ChangeStatus.Draft))">
            <RotateCcw class="size-4" />
            Back to Draft
          </Button>
          <Button @click="requireAuth(() => doSetStatus(ChangeStatus.Approved))"> Approve </Button>
        </template>
        <template v-else-if="entity.status === ChangeStatus.Approved">
          <Button
            class="bg-success text-success-content hover:bg-success/90"
            @click="requireAuth(() => doMerge())"
          >
            <GitMerge class="size-4" />
            Merge
          </Button>
        </template>
      </div>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-2">
          <div><span class="font-semibold">Title:</span> {{ entity.title }}</div>
          <div v-if="entity.description">
            <span class="font-semibold">Description:</span> {{ entity.description }}
          </div>
          <div>
            <span class="font-semibold">Created by:</span> {{ entity.user?.name
            }}<span v-if="entity.user?.username" class="ml-1 opacity-60"
              >@{{ entity.user.username }}</span
            >
          </div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle class="flex items-center justify-between">
            <span>Edits ({{ editsPager.totalCount.value ?? 0 }})</span>
            <GridPagerButtons
              :has-previous-page="editsPager.hasPreviousPage.value"
              :has-next-page="editsPager.hasNextPage.value"
              @prev="editsPager.prevPage"
              @next="editsPager.nextPage"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="editsPager.nodes.value.length" class="flex h-[28rem] gap-3">
            <ul class="w-1/2 space-y-2 overflow-y-auto">
              <li
                v-for="(edit, i) in editsPager.nodes.value"
                :key="edit.id ?? i"
                class="cursor-pointer rounded-md border p-2 text-sm transition-colors"
                :class="
                  selectedEditId === edit.id
                    ? 'border-primary bg-primary/10'
                    : 'border-base-300 hover:bg-base-200'
                "
                @click="selectedEditId = edit.id ?? null"
              >
                <span class="badge badge-outline badge-sm">{{ edit.entityName }}</span>
                <span v-if="edit.id" class="ml-2 font-mono text-xs opacity-50">{{ edit.id }}</span>
              </li>
            </ul>
            <div
              class="flex h-full w-1/2 flex-col rounded-md border border-base-300 bg-base-200 p-3"
            >
              <template v-if="selectedEdit">
                <div class="mb-2 flex items-center gap-1">
                  <Button
                    v-for="opt in viewOptions"
                    :key="opt.value"
                    size="xs"
                    :variant="editView === opt.value ? 'default' : 'outline'"
                    @click="editView = opt.value"
                  >
                    {{ opt.label }}
                  </Button>
                </div>
                <div v-if="editView === 'diff'" class="flex flex-col gap-1.5 overflow-y-auto">
                  <div v-if="!diffs.length" class="text-sm opacity-60">No changes</div>
                  <div
                    v-for="diff in diffs"
                    :key="diff.key"
                    class="rounded-md border p-2 text-xs"
                    :class="diffClass(diff.kind)"
                  >
                    <div class="flex items-center gap-2 font-semibold">
                      <span class="badge badge-xs" :class="diffBadgeClass(diff.kind)">
                        {{ diffSymbol(diff.kind) }}
                      </span>
                      <span class="font-mono">{{ diff.key }}</span>
                    </div>
                    <div v-if="diff.kind === 'modified'" class="mt-1 space-y-1 font-mono">
                      <div class="break-all whitespace-pre-wrap line-through opacity-70">
                        {{ formatValue(diff.oldValue) }}
                      </div>
                      <div class="break-all whitespace-pre-wrap">
                        {{ formatValue(diff.newValue) }}
                      </div>
                    </div>
                    <div v-else class="mt-1 font-mono break-all whitespace-pre-wrap">
                      {{ formatValue(diff.kind === 'added' ? diff.newValue : diff.oldValue) }}
                    </div>
                  </div>
                </div>
                <div v-else-if="editView === 'raw'" class="overflow-auto">
                  <pre
                    v-if="selectedEdit.changesJSON"
                    class="text-xs break-all whitespace-pre-wrap"
                    >{{ JSON.stringify(selectedEdit.changesJSON, null, 2) }}</pre
                  >
                  <div v-else class="text-sm opacity-60">No changes</div>
                </div>
                <SidebarEditGraphView
                  v-else-if="editView === 'graph'"
                  class="min-h-0 flex-1"
                  :entity-name="selectedEdit.entityName"
                  :ref-nodes="selectedEdit.refNodes"
                />
              </template>
              <div v-else class="text-sm opacity-60">Select an edit to view its diff</div>
            </div>
          </div>
          <div v-else class="text-sm opacity-60">No edits</div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader><CardTitle>Sources</CardTitle></CardHeader>
        <CardContent>
          <div class="grid grid-cols-4 gap-2">
            <SourceCard
              v-for="cs in entity.sources?.nodes ?? []"
              :key="cs.source.id"
              :source="cs.source"
            />
          </div>
          <div v-if="!entity.sources?.nodes?.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>
    </div>

    <div v-else class="flex justify-center p-8">
      <span class="loading loading-lg loading-spinner" />
    </div>

    <Dialog v-model:open="showEdit">
      <DialogContent class="max-h-[80vh] overflow-auto">
        <DialogTitle>Edit Change</DialogTitle>
        <form class="flex flex-col gap-4" @submit.prevent="doEdit">
          <div class="flex flex-col gap-1">
            <label class="label">Title</label>
            <FormInput v-model="editForm.title" placeholder="Title" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="label">Description</label>
            <FormTextArea v-model="editForm.description" placeholder="Description" />
          </div>
          <DialogFooter>
            <Button variant="outline" type="button" @click="showEdit = false">Cancel</Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showDelete">
      <DialogContent>
        <DialogTitle>Delete Change</DialogTitle>
        <p>
          Are you sure you want to delete <strong>{{ entity?.title }}</strong
          >?
        </p>
        <DialogFooter>
          <Button variant="outline" @click="showDelete = false">Cancel</Button>
          <Button variant="destructive" @click="doDelete">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, GitMerge, Maximize2, Pencil, RotateCcw, Send, Trash2, X } from '@lucide/vue'

import { graphql } from '~/gql'
import { ChangeStatus } from '~/gql/graphql'

const props = defineProps<{
  id: string
  mode?: 'page' | 'panel'
}>()

const emit = defineEmits<{ close: [] }>()

const { requireAuth } = useRequireAuth()

const detailQuery = graphql(`
  query ChangeDetail($id: ID!) {
    change(id: $id) {
      id
      title
      description
      status
      createdAt
      updatedAt
      user {
        id
        name
        username
      }
      sources(first: 10) {
        nodes {
          source {
            id
            ...SourceCardFragment
          }
        }
      }
    }
  }
`)

const { result, refetch } = useQuery(detailQuery, () => ({ id: props.id }))
const entity = computed(() => result.value?.change ?? null)

const changeEditsQuery = graphql(`
  query ChangeEdits($id: ID!, $first: Int, $last: Int, $after: String, $before: String) {
    change(id: $id) {
      id
      edits(first: $first, last: $last, after: $after, before: $before) {
        totalCount
        nodes {
          id
          entityName
          originalJSON
          changesJSON
          changes {
            __typename
          }
          refNodes {
            id
            op
            field
          }
        }
        pageInfo {
          hasPreviousPage
          hasNextPage
          startCursor
          endCursor
        }
      }
    }
  }
`)
const editsPager = useRelationPager(changeEditsQuery, 'change', 'edits', () => props.id)

const selectedEditId = ref<string | null>(null)
const selectedEdit = computed(
  () =>
    editsPager.nodes.value.find((e: { id?: string | null }) => e.id === selectedEditId.value) ??
    null,
)

const { editView, diffs, diffClass, diffBadgeClass, diffSymbol, formatValue } =
  useEditDiff(selectedEdit)

const viewOptions: { value: EditView; label: string }[] = [
  { value: 'graph', label: 'Graph' },
  { value: 'diff', label: 'Diff' },
  { value: 'raw', label: 'Raw' },
]

const updateChangeMutation = graphql(`
  mutation UpdateChangeDetail($input: UpdateChangeInput!) {
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
  mutation DeleteChange($id: ID!) {
    deleteChange(id: $id) {
      success
    }
  }
`)

const mergeChangeMutation = graphql(`
  mutation MergeChange($id: ID!) {
    mergeChange(id: $id) {
      change {
        id
        status
      }
    }
  }
`)

const { mutate: updateChange } = useMutation(updateChangeMutation)
const { mutate: deleteChange } = useMutation(deleteChangeMutation)
const { mutate: mergeChange } = useMutation(mergeChangeMutation)

const editForm = reactive({ title: '', description: '' })

watch(
  entity,
  (val) => {
    if (val) {
      editForm.title = val.title ?? ''
      editForm.description = val.description ?? ''
    }
  },
  { immediate: true },
)

const showEdit = ref(false)
const showDelete = ref(false)

const doSetStatus = async (status: ChangeStatus) => {
  await updateChange({ input: { id: props.id, status } })
  await refetch()
}

const doMerge = async () => {
  await mergeChange({ id: props.id })
  await refetch()
}

const doEdit = async () => {
  await updateChange({
    input: { id: props.id, title: editForm.title, description: editForm.description },
  })
  await refetch()
  showEdit.value = false
}

const doDelete = async () => {
  await deleteChange({ id: props.id })
  navigateTo('/changes')
}
</script>
