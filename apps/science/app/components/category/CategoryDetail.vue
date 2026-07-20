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
              navigateTo(`/categories/${id}`)
            }
          "
        >
          <Maximize2 class="size-4" />
        </Button>
      </template>
      <div class="flex-1">
        <h1 class="text-xl font-bold">{{ entity?.name ?? id }}</h1>
        <EntityMeta
          v-if="entity"
          :id="entity.id"
          :created-at="entity.createdAt"
          :updated-at="entity.updatedAt"
        />
      </div>
      <template v-if="mode === 'page'">
        <Button
          :disabled="!isChangeSelected"
          @click="requireAuth(() => navigateTo(`/categories/${id}/edit`))"
        >
          <Pencil class="size-4" />
          Edit
        </Button>
        <Button
          variant="destructive"
          :disabled="!isChangeSelected"
          @click="requireAuth(() => (showDelete = true))"
        >
          <Trash2 class="size-4" />
          Delete
        </Button>
      </template>
    </div>

    <div
      v-if="mode === 'page' && !isChangeSelected"
      role="alert"
      class="mx-3 mb-3 alert alert-warning"
    >
      <span>Select a change from the sidebar to edit or delete.</span>
    </div>

    <div v-if="entity">
      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent class="flex gap-4">
          <UiImage v-if="entity.imageURL" class="size-24 rounded" :src="entity.imageURL" />
          <div class="flex flex-col gap-1">
            <div><span class="font-semibold">Name:</span> {{ entity.name }}</div>
            <div v-if="entity.descShort">
              <span class="font-semibold">Short description:</span> {{ entity.descShort }}
            </div>
            <div v-if="entity.desc">
              <span class="font-semibold">Description:</span> {{ entity.desc }}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Parent Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <div v-for="parent in entity.parents?.nodes ?? []" :key="parent.id">
              <ModelListCategory
                :category="parent"
                :on-row-click="() => panelStore.openPanel('category', parent.id)"
              />
            </div>
          </ul>
          <div v-if="!entity.parents?.nodes?.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Child Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <div v-for="child in entity.children?.nodes ?? []" :key="child.id">
              <ModelListCategory
                :category="child"
                :on-row-click="() => panelStore.openPanel('category', child.id)"
              />
            </div>
          </ul>
          <div v-if="!entity.children?.nodes?.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <div v-for="item in entity.items?.nodes ?? []" :key="item.id">
              <ModelListItem
                :item="item"
                :on-row-click="() => panelStore.openPanel('item', item.id)"
              />
            </div>
          </ul>
          <div v-if="!entity.items?.nodes?.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Related Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <div v-for="cat in entity.related?.nodes ?? []" :key="cat.id">
              <ModelListCategory
                :category="cat"
                :on-row-click="() => panelStore.openPanel('category', cat.id)"
              />
            </div>
          </ul>
          <div v-if="!entity.related?.nodes?.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>
    </div>

    <div v-else class="flex justify-center p-8">
      <span class="loading loading-lg loading-spinner" />
    </div>

    <Dialog v-model:open="showDelete">
      <DialogContent>
        <DialogTitle>Delete Category</DialogTitle>
        <p>
          Are you sure you want to delete <strong>{{ entity?.name }}</strong
          >? This action requires a change.
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
import { ArrowLeft, Maximize2, Pencil, Trash2, X } from '@lucide/vue'

import { graphql } from '~/gql'
import { useDetailPanelStore } from '~/stores/detail_panel_store'

const props = defineProps<{
  id: string
  mode?: 'page' | 'panel'
}>()

const panelStore = useDetailPanelStore()

const emit = defineEmits<{ close: [] }>()

const { requireAuth } = useRequireAuth()
const changeStore = useChangeStore()
const { selectedChange, isChangeSelected } = storeToRefs(changeStore)

const detailQuery = graphql(`
  query CategoryDetail($id: ID!) {
    category(id: $id) {
      id
      name
      desc
      descShort
      imageURL
      createdAt
      updatedAt
      parents(first: 10) {
        nodes {
          id
          ...ListCategoryFragment
        }
      }
      children(first: 20) {
        nodes {
          id
          ...ListCategoryFragment
        }
      }
      items(first: 20) {
        nodes {
          id
          ...ListItemFragment
        }
      }
      related(limit: 10) {
        nodes {
          id
          ...ListCategoryFragment
        }
      }
    }
  }
`)

const { result } = useQuery(detailQuery, () => ({ id: props.id }))
const entity = computed(() => result.value?.category ?? null)

const deleteCategoryMutation = graphql(`
  mutation DeleteCategory($input: DeleteInput!) {
    deleteCategory(input: $input) {
      success
    }
  }
`)

const { mutate: deleteCategory } = useMutation(deleteCategoryMutation)
const showDelete = ref(false)

const doDelete = async () => {
  await deleteCategory({ input: { id: props.id, changeID: selectedChange.value } })
  navigateTo('/categories')
}
</script>
