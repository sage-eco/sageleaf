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
              navigateTo(`/variants/${id}`)
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
          @click="requireAuth(() => navigateTo(`/variants/${id}/edit`))"
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
          <CardTitle class="flex items-center justify-between">
            <span>Items</span>
            <GridPagerButtons
              :has-previous-page="itemsPager.hasPreviousPage.value"
              :has-next-page="itemsPager.hasNextPage.value"
              @prev="itemsPager.prevPage"
              @next="itemsPager.nextPage"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <div v-for="item in itemsPager.nodes.value" :key="item.id">
              <ModelListItem
                :item="item"
                :on-row-click="() => panelStore.openPanel('item', item.id)"
              />
            </div>
          </ul>
          <div v-if="!itemsPager.nodes.value.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle class="flex items-center justify-between">
            <span>Components</span>
            <GridPagerButtons
              :has-previous-page="componentsPager.hasPreviousPage.value"
              :has-next-page="componentsPager.hasNextPage.value"
              @prev="componentsPager.prevPage"
              @next="componentsPager.nextPage"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <div v-for="vc in componentsPager.nodes.value" :key="vc.component.id">
              <ModelListComponent
                :component="vc.component"
                :on-row-click="() => panelStore.openPanel('component', vc.component.id)"
              />
              <div v-if="vc.quantity" class="pl-4 text-xs opacity-70">
                Quantity: {{ vc.quantity }}{{ vc.unit ? ` ${vc.unit}` : '' }}
              </div>
            </div>
          </ul>
          <div v-if="!componentsPager.nodes.value.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle class="flex items-center justify-between">
            <span>Organizations</span>
            <GridPagerButtons
              :has-previous-page="orgsPager.hasPreviousPage.value"
              :has-next-page="orgsPager.hasNextPage.value"
              @prev="orgsPager.prevPage"
              @next="orgsPager.nextPage"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <ModelListOrg
              v-for="vo in orgsPager.nodes.value"
              :key="vo.org.id"
              :org="vo.org"
              :on-row-click="() => panelStore.openPanel('org', vo.org.id)"
            />
          </ul>
          <div v-if="!orgsPager.nodes.value.length" class="text-sm opacity-60">None</div>
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
          <CardTitle>Regions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <ModelListRegion
              v-for="region in entity.regions?.nodes ?? []"
              :key="region.id"
              :region="region"
            />
          </ul>
          <div v-if="!entity.regions?.nodes?.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader><CardTitle>Sources</CardTitle></CardHeader>
        <CardContent>
          <div class="grid grid-cols-4 gap-2">
            <SourceCard
              v-for="vs in entity.sources?.nodes ?? []"
              :key="vs.source.id"
              :source="vs.source"
            />
          </div>
          <div v-if="!entity.sources?.nodes?.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>
    </div>

    <div v-else class="flex justify-center p-8">
      <span class="loading loading-lg loading-spinner" />
    </div>

    <Dialog v-model:open="showDelete">
      <DialogContent>
        <DialogTitle>Delete Variant</DialogTitle>
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
  query VariantDetail($id: ID!) {
    variant(id: $id) {
      id
      name
      desc
      imageURL
      createdAt
      updatedAt
      regions(first: 10) {
        nodes {
          id
          ...ListRegionFragment
        }
      }
      tags(first: 20) {
        nodes {
          id
          name
          bgColor
        }
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

const { result } = useQuery(detailQuery, () => ({ id: props.id }))
const entity = computed(() => result.value?.variant ?? null)

const variantItemsQuery = graphql(`
  query VariantItems($id: ID!, $first: Int, $last: Int, $after: String, $before: String) {
    variant(id: $id) {
      id
      items(first: $first, last: $last, after: $after, before: $before) {
        nodes {
          id
          ...ListItemFragment
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
const itemsPager = useRelationPager(variantItemsQuery, 'variant', 'items', () => props.id)

const variantComponentsQuery = graphql(`
  query VariantComponents($id: ID!, $first: Int, $last: Int, $after: String, $before: String) {
    variant(id: $id) {
      id
      components(first: $first, last: $last, after: $after, before: $before) {
        nodes {
          component {
            id
            ...ListComponentFragment
          }
          quantity
          unit
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
const componentsPager = useRelationPager(
  variantComponentsQuery,
  'variant',
  'components',
  () => props.id,
)

const variantOrgsQuery = graphql(`
  query VariantOrgs($id: ID!, $first: Int, $last: Int, $after: String, $before: String) {
    variant(id: $id) {
      id
      orgs(first: $first, last: $last, after: $after, before: $before) {
        nodes {
          org {
            id
            ...ListOrgFragment
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
const orgsPager = useRelationPager(variantOrgsQuery, 'variant', 'orgs', () => props.id)

const deleteVariantMutation = graphql(`
  mutation DeleteVariant($input: DeleteInput!) {
    deleteVariant(input: $input) {
      success
    }
  }
`)

const { mutate: deleteVariant } = useMutation(deleteVariantMutation)
const showDelete = ref(false)

const doDelete = async () => {
  await deleteVariant({ input: { id: props.id, changeID: selectedChange.value } })
  navigateTo('/variants')
}
</script>
