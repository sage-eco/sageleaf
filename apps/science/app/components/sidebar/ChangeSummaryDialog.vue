<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[80vh] max-w-5xl! overflow-auto">
      <DialogHeader class="flex flex-row items-center justify-between gap-2">
        <DialogTitle>{{ data?.title || changeId }}</DialogTitle>
        <Button
          v-if="changeId"
          variant="outline"
          size="icon"
          title="View full details"
          @click="goToChange"
        >
          <ExternalLink :size="16" />
        </Button>
      </DialogHeader>
      <div v-if="data" class="flex flex-col gap-4">
        <div class="flex items-center gap-3 rounded-lg border px-4 py-3" :class="statusBorderClass">
          <span class="badge badge-md font-semibold" :class="statusBadgeClass">
            {{ data.status }}
          </span>
          <div class="flex-1 text-sm opacity-60">{{ statusText }}</div>
        </div>

        <Card class="border-0 bg-base-100 shadow-none">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent class="flex flex-col gap-1 text-sm">
            <div v-if="data.title"><span class="font-semibold">Title:</span> {{ data.title }}</div>
            <div v-if="data.description">
              <span class="font-semibold">Description:</span>
              {{ data.description }}
            </div>
            <div v-if="data.user?.name">
              <span class="font-semibold">Created by:</span> {{ data.user.name }}
            </div>
            <div v-if="data.createdAt">
              <span class="font-semibold">Created:</span>
              {{ formatDate(data.createdAt) }}
            </div>
            <div v-if="data.updatedAt">
              <span class="font-semibold">Updated:</span>
              {{ formatDate(data.updatedAt) }}
            </div>
          </CardContent>
        </Card>

        <Card class="border-0 bg-base-100 shadow-none">
          <CardHeader>
            <CardTitle>Edits ({{ data.edits?.totalCount ?? 0 }})</CardTitle>
          </CardHeader>
          <CardContent>
            <div v-if="data.edits?.nodes?.length" class="flex gap-3">
              <ul class="w-[30%] space-y-2 overflow-y-auto">
                <li
                  v-for="(edit, i) in data.edits.nodes"
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
                  <span v-if="edit.id" class="ml-2 font-mono text-xs opacity-50">
                    {{ edit.id }}
                  </span>
                </li>
              </ul>
              <div class="w-[70%] rounded-md border border-base-300 bg-base-200 p-3">
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
                  <div v-if="editView === 'diff'" class="flex flex-col gap-1.5">
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
                  <div v-else-if="selectedEdit.changesJSON" class="overflow-x-auto">
                    <pre class="text-xs break-all whitespace-pre-wrap">{{
                      JSON.stringify(selectedEdit.changesJSON, null, 2)
                    }}</pre>
                  </div>
                  <div v-else class="text-sm opacity-60">No changes</div>
                </template>
                <div v-else class="text-sm opacity-60">Select an edit to view its diff</div>
              </div>
            </div>
            <div v-else class="text-sm opacity-60">No edits</div>
          </CardContent>
        </Card>

        <Card class="border-0 bg-base-100 shadow-none">
          <CardHeader>
            <CardTitle>Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ul v-if="data.sources?.nodes?.length" class="space-y-2">
              <li
                v-for="cs in data.sources.nodes"
                :key="cs.source.id"
                class="flex items-center gap-2 text-sm"
              >
                <span class="badge badge-outline badge-sm">{{ cs.source.type }}</span>
                <a
                  v-if="cs.source.contentURL"
                  :href="cs.source.contentURL"
                  target="_blank"
                  class="max-w-xs link truncate link-primary"
                  >{{ cs.source.contentURL }}</a
                >
              </li>
            </ul>
            <div v-else class="text-sm opacity-60">None</div>
          </CardContent>
        </Card>
      </div>
      <div v-else class="flex justify-center p-8">
        <span class="loading loading-lg loading-spinner" />
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ExternalLink } from '@lucide/vue'

import { graphql } from '~/gql'

const props = defineProps<{ changeId: string | undefined }>()
const open = defineModel<boolean>('open', { required: true })

const ChangeSummaryQuery = graphql(`
  query ChangeSidebarSummary($id: ID!) {
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
      }
      sources(first: 10) {
        nodes {
          source {
            id
            type
            contentURL
            location
          }
        }
      }
      edits(first: 20) {
        totalCount
        nodes {
          id
          entityName
          originalJSON
          changesJSON
          changes {
            __typename
          }
        }
      }
    }
  }
`)

const { result, load } = useLazyQuery(ChangeSummaryQuery, () => ({
  id: props.changeId ?? '',
}))

const data = computed(() => result.value?.change ?? null)
const changeStatus = computed(() => data.value?.status ?? null)
const {
  badgeClass: statusBadgeClass,
  borderClass: statusBorderClass,
  text: statusText,
} = useChangeStatusDisplay(changeStatus)

const selectedEditId = ref<string | null>(null)
const selectedEdit = computed(() => {
  if (!data.value?.edits?.nodes) return null
  return data.value.edits.nodes.find((e) => e.id === selectedEditId.value) ?? null
})

const { editView, diffs, diffClass, diffBadgeClass, diffSymbol, formatValue, resetView } =
  useEditDiff(selectedEdit)

const viewOptions: { value: 'diff' | 'raw'; label: string }[] = [
  { value: 'diff', label: 'Diff' },
  { value: 'raw', label: 'Raw' },
]

const goToChange = () => {
  if (!props.changeId) return
  open.value = false
  navigateTo(`/changes/${props.changeId}`)
}

watch(open, (val) => {
  if (val && props.changeId) {
    selectedEditId.value = null
    resetView()
    load(ChangeSummaryQuery, { id: props.changeId })
  }
})
</script>
