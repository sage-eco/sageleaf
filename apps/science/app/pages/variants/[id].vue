<template>
  <div>
    <div class="flex items-start gap-3 p-3">
      <Button variant="ghost" @click="router.back()">
        <ArrowLeft class="size-4" />
      </Button>
      <div class="flex-1">
        <h1 class="text-xl font-bold">{{ entity?.name ?? id }}</h1>
        <EntityMeta
          v-if="entity"
          :id="entity.id"
          :created-at="entity.createdAt"
          :updated-at="entity.updatedAt"
        />
      </div>
      <Button :disabled="!isChangeSelected" @click="requireAuth(() => (showEdit = true))">
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
    </div>

    <div v-if="!isChangeSelected" role="alert" class="mx-3 mb-3 alert alert-warning">
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
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <div v-for="item in entity.items?.nodes ?? []" :key="item.id">
              <ModelListItem :item="item" :href="`/items/${item.id}`" />
            </div>
          </ul>
          <div v-if="!entity.items?.nodes?.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Components</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <div v-for="vc in entity.components?.nodes ?? []" :key="vc.component.id">
              <ModelListComponent
                :component="vc.component"
                :href="`/components/${vc.component.id}`"
              />
              <div v-if="vc.quantity" class="pl-4 text-xs opacity-70">
                Quantity: {{ vc.quantity }}{{ vc.unit ? ` ${vc.unit}` : '' }}
              </div>
            </div>
          </ul>
          <div v-if="!entity.components?.nodes?.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="space-y-1">
            <li v-for="vo in entity.orgs?.nodes ?? []" :key="vo.org.id" class="text-sm">
              {{ vo.org.name }}
            </li>
          </ul>
          <div v-if="!entity.orgs?.nodes?.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Regions</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="space-y-1">
            <li v-for="region in entity.regions?.nodes ?? []" :key="region.id" class="text-sm">
              <div class="font-medium">{{ region.name }}</div>
              <div v-if="region.desc" class="text-xs opacity-60">{{ region.desc }}</div>
            </li>
          </ul>
          <div v-if="!entity.regions?.nodes?.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="space-y-2">
            <li
              v-for="vs in entity.sources?.nodes ?? []"
              :key="vs.source.id"
              class="flex items-center gap-2 text-sm"
            >
              <span class="badge badge-outline badge-sm">{{ vs.source.type }}</span>
              <a
                v-if="vs.source.contentURL"
                :href="vs.source.contentURL"
                target="_blank"
                class="max-w-xs link truncate link-primary"
                >{{ vs.source.contentURL }}</a
              >
              <NuxtLink :to="`/sources/${vs.source.id}`" class="link text-xs link-secondary"
                >View</NuxtLink
              >
            </li>
          </ul>
          <div v-if="!entity.sources?.nodes?.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>
    </div>

    <div v-else class="flex justify-center p-8">
      <span class="loading loading-lg loading-spinner" />
    </div>

    <Dialog v-model:open="showEdit">
      <DialogContent class="max-h-[80vh] overflow-auto sm:max-w-[70vw]">
        <DialogTitle>Edit Variant</DialogTitle>
        <ModelForm
          :change-id="selectedChange"
          :model-id="id"
          :schema-query="variantSchema"
          :create-mutation="createVariantMutation"
          :update-mutation="updateVariantMutation"
          :create-model-key="'variant'"
          @saved="showEdit = false"
        />
      </DialogContent>
    </Dialog>

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
import { ArrowLeft, Pencil, Trash2 } from '@lucide/vue'

import { graphql } from '~/gql'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const { requireAuth } = useRequireAuth()

const changeStore = useChangeStore()
const { selectedChange, isChangeSelected } = storeToRefs(changeStore)

const detailQuery = graphql(`
  query VariantDetail($id: ID!) {
    variant(id: $id) {
      id
      name
      desc
      imageURL
      createdAt
      updatedAt
      items(first: 10) {
        nodes {
          id
          ...ListItemFragment
        }
      }
      components(first: 20) {
        nodes {
          component {
            id
            ...ListComponentFragment
          }
          quantity
          unit
        }
      }
      orgs(first: 10) {
        nodes {
          org {
            id
            name
          }
        }
      }
      regions(first: 10) {
        nodes {
          id
          name
          desc
        }
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
    }
  }
`)

const { result } = useQuery(detailQuery, { id })
const entity = computed(() => result.value?.variant ?? null)

const variantSchema = graphql(`
  query VariantDetailSchema {
    variantSchema {
      create {
        schema
        uischema
      }
      update {
        schema
        uischema
      }
    }
  }
`)

const createVariantMutation = graphql(`
  mutation CreateVariantFromDetail($input: CreateVariantInput!) {
    createVariant(input: $input) {
      variant {
        id
        name
      }
    }
  }
`)

const updateVariantMutation = graphql(`
  mutation UpdateVariantFromDetail($input: UpdateVariantInput!) {
    updateVariant(input: $input) {
      variant {
        id
        name
      }
    }
  }
`)

const deleteVariantMutation = graphql(`
  mutation DeleteVariantFromDetail($input: DeleteInput!) {
    deleteVariant(input: $input) {
      success
    }
  }
`)

const { mutate: deleteVariant } = useMutation(deleteVariantMutation)

const showEdit = ref(false)
const showDelete = ref(false)

const doDelete = async () => {
  await deleteVariant({ input: { id, changeID: selectedChange.value } })
  navigateTo('/variants')
}
</script>
