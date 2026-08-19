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
              navigateTo(`/items/${id}`)
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
          @click="requireAuth(() => navigateTo(`/items/${id}/edit`))"
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
            <div v-if="entity.desc">
              <span class="font-semibold">Description:</span> {{ entity.desc }}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Categories</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <div v-for="cat in entity.categories?.nodes ?? []" :key="cat.id">
              <ModelListCategory
                :category="cat"
                :on-row-click="() => panelStore.openPanel('category', cat.id)"
              />
            </div>
          </ul>
          <div v-if="!entity.categories?.nodes?.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle class="flex items-center justify-between">
            <span>Variants</span>
            <GridPagerButtons
              :has-previous-page="variantsPager.hasPreviousPage.value"
              :has-next-page="variantsPager.hasNextPage.value"
              @prev="variantsPager.prevPage"
              @next="variantsPager.nextPage"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <div v-for="variant in variantsPager.nodes.value" :key="variant.id">
              <ModelListVariant
                :variant="variant"
                :on-row-click="() => panelStore.openPanel('variant', variant.id)"
              />
            </div>
          </ul>
          <div v-if="!variantsPager.nodes.value.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>
      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="entity.tags?.nodes?.length" class="flex flex-wrap gap-2">
            <span
              v-for="tag in entity.tags.nodes"
              :key="tag.id"
              class="badge badge-outline"
              :style="tag.bgColor ? { backgroundColor: tag.bgColor } : {}"
              >{{ tag.name }}</span
            >
          </div>
          <div v-else class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Related Items</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <div v-for="item in entity.related?.nodes ?? []" :key="item.id">
              <ModelListItem
                :item="item"
                :on-row-click="() => panelStore.openPanel('item', item.id)"
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
        <DialogTitle>Delete Item</DialogTitle>
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

const emit = defineEmits<{ close: [] }>()

const { requireAuth } = useRequireAuth()
const changeStore = useChangeStore()
const { selectedChange, isChangeSelected } = storeToRefs(changeStore)
const panelStore = useDetailPanelStore()

const detailQuery = graphql(`
  query ItemDetail($id: ID!) {
    item(id: $id) {
      id
      name
      desc
      imageURL
      createdAt
      updatedAt
      categories(first: 10) {
        nodes {
          id
          ...ListCategoryFragment
        }
      }
      tags(first: 20) {
        nodes {
          id
          name
          bgColor
        }
      }
      related(limit: 10) {
        nodes {
          id
          ...ListItemFragment
        }
      }
    }
  }
`)

const { result } = useQuery(detailQuery, () => ({ id: props.id }))
const entity = computed(() => result.value?.item ?? null)

const itemVariantsQuery = graphql(`
  query ItemVariants($id: ID!, $first: Int, $last: Int, $after: String, $before: String) {
    item(id: $id) {
      id
      variants(first: $first, last: $last, after: $after, before: $before) {
        nodes {
          id
          ...ListVariantFragment
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
const variantsPager = useRelationPager(itemVariantsQuery, 'item', 'variants', () => props.id)

const deleteItemMutation = graphql(`
  mutation DeleteItem($input: DeleteInput!) {
    deleteItem(input: $input) {
      success
    }
  }
`)

const { mutate: deleteItem } = useMutation(deleteItemMutation)
const showDelete = ref(false)

const doDelete = async () => {
  await deleteItem({ input: { id: props.id, changeID: selectedChange.value } })
  navigateTo('/items')
}
</script>
