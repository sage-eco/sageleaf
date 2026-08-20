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
              navigateTo(`/sources/${id}`)
            }
          "
        >
          <Maximize2 class="size-4" />
        </Button>
      </template>
      <div class="flex-1">
        <h1 class="text-xl font-bold">
          <span class="mr-2 badge badge-outline">{{ entity?.type }}</span>
          {{ entity?.contentURL ?? id }}
        </h1>
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
      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-2 text-sm">
          <div>
            <span class="font-semibold">Type:</span>
            <span class="ml-2 badge badge-outline badge-sm">{{ entity.type }}</span>
          </div>
          <div v-if="entity.contentURL">
            <span class="font-semibold">URL:</span>
            <a :href="entity.contentURL" target="_blank" class="ml-2 link link-primary">{{
              entity.contentURL
            }}</a>
          </div>
          <div v-if="entity.location">
            <span class="font-semibold">Location:</span> {{ entity.location }}
          </div>
          <div v-if="entity.processedAt">
            <span class="font-semibold">Processed:</span> {{ entity.processedAt }}
          </div>
          <div><span class="font-semibold">Created by:</span> {{ entity.user?.name }}</div>
        </CardContent>
      </Card>

      <Card v-if="entity.metadata" class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent>
          <pre class="overflow-auto rounded bg-base-200 p-3 text-xs">{{
            JSON.stringify(entity.metadata, null, 2)
          }}</pre>
        </CardContent>
      </Card>

      <Card v-if="entity.content" class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Content</CardTitle>
        </CardHeader>
        <CardContent>
          <pre class="overflow-auto rounded bg-base-200 p-3 text-xs">{{
            JSON.stringify(entity.content, null, 2)
          }}</pre>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Changes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <div v-for="change in entity.changes?.nodes ?? []" :key="change.id">
              <ModelListChange
                :change="change"
                :on-row-click="() => panelStore.openPanel('change', change.id)"
              />
            </div>
          </ul>
          <div v-if="!entity.changes?.nodes?.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>
    </div>

    <div v-else class="flex justify-center p-8">
      <span class="loading loading-lg loading-spinner" />
    </div>

    <Dialog v-model:open="showEdit">
      <DialogContent class="max-h-[80vh] overflow-auto">
        <DialogTitle>Edit Source</DialogTitle>
        <SourceForm
          v-if="entity"
          :source-id="id"
          :initial-type="entity.type"
          :initial-content-u-r-l="entity.contentURL ?? undefined"
          :initial-text="entityContentText"
          :initial-metadata="entity.metadata"
          @saved="onSaved"
        />
      </DialogContent>
    </Dialog>

    <Dialog v-model:open="showDelete">
      <DialogContent>
        <DialogTitle>Delete Source</DialogTitle>
        <p>Are you sure you want to delete this source?</p>
        <DialogFooter>
          <Button variant="outline" @click="showDelete = false">Cancel</Button>
          <Button variant="destructive" @click="doDelete">Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Maximize2, Pencil, Trash2, X } from '@lucide/vue'

import { graphql } from '~/gql'
import { useDetailPanelStore } from '~/stores/detail_panel_store'

const props = defineProps<{
  id: string
  mode?: 'page' | 'panel'
}>()

const emit = defineEmits<{ close: [] }>()

const { requireAuth } = useRequireAuth()
const panelStore = useDetailPanelStore()

const detailQuery = graphql(`
  query SourceDetail($id: ID!) {
    source(id: $id) {
      id
      type
      contentURL
      location
      metadata
      content
      processedAt
      createdAt
      updatedAt
      user {
        id
        name
      }
      changes {
        nodes {
          id
          ...ListChangeFragment
        }
      }
    }
  }
`)

const { result, refetch } = useQuery(detailQuery, () => ({ id: props.id }))
const entity = computed(() => result.value?.source ?? null)
const entityContentText = computed(() => {
  const content = entity.value?.content as Record<string, unknown> | null | undefined
  return typeof content?.text === 'string' ? content.text : undefined
})

const deleteSourceMutation = graphql(`
  mutation DeleteSource($id: ID!) {
    deleteSource(id: $id) {
      success
    }
  }
`)

const { mutate: deleteSource } = useMutation(deleteSourceMutation)
const showEdit = ref(false)
const showDelete = ref(false)

const onSaved = async () => {
  await refetch()
  showEdit.value = false
}

const doDelete = async () => {
  await deleteSource({ id: props.id })
  navigateTo('/sources')
}
</script>
