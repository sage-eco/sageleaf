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
              navigateTo(`/processes/${id}`)
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
          @click="requireAuth(() => navigateTo(`/processes/${id}/edit`))"
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
        <CardContent class="flex flex-col gap-2">
          <div><span class="font-semibold">Name:</span> {{ entity.name }}</div>
          <div v-if="entity.desc">
            <span class="font-semibold">Description:</span> {{ entity.desc }}
          </div>
          <div>
            <span class="font-semibold">Intent:</span>
            <span class="ml-2 badge badge-outline badge-sm">{{ entity.intent }}</span>
          </div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>References</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <ModelListMaterial
              v-if="entity.material"
              :material="entity.material"
              :on-row-click="() => panelStore.openPanel('material', entity!.material!.id)"
            />
            <ModelListOrg
              v-if="entity.org"
              :org="entity.org"
              :on-row-click="() => panelStore.openPanel('org', entity!.org!.id)"
            />
            <ModelListPlace
              v-if="entity.place"
              :place="entity.place"
              :on-row-click="() => panelStore.openPanel('place', entity!.place!.id)"
            />
            <ModelListRegion
              v-if="entity.region"
              :region="entity.region"
              :on-row-click="() => panelStore.openPanel('region', entity!.region!.id)"
            />
            <ModelListVariant
              v-if="entity.variant"
              :variant="entity.variant"
              :on-row-click="() => panelStore.openPanel('variant', entity!.variant!.id)"
            />
          </ul>
          <div v-if="noRefs" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader><CardTitle>Sources</CardTitle></CardHeader>
        <CardContent>
          <div class="grid grid-cols-4 gap-2">
            <SourceCard
              v-for="ps in entity.sources?.nodes ?? []"
              :key="ps.source.id"
              :source="ps.source"
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
        <DialogTitle>Delete Process</DialogTitle>
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
  query ProcessDetail($id: ID!) {
    process(id: $id) {
      id
      name
      desc
      intent
      createdAt
      updatedAt
      material {
        id
        ...ListMaterialFragment
      }
      org {
        id
        ...ListOrgFragment
      }
      place {
        id
        ...ListPlaceFragment
      }
      region {
        id
        ...ListRegionFragment
      }
      variant {
        id
        ...ListVariantFragment
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
const entity = computed(() => result.value?.process ?? null)

const noRefs = computed(
  () =>
    !entity.value?.material &&
    !entity.value?.org &&
    !entity.value?.place &&
    !entity.value?.region &&
    !entity.value?.variant,
)

const deleteProcessMutation = graphql(`
  mutation DeleteProcess($input: DeleteInput!) {
    deleteProcess(input: $input) {
      success
    }
  }
`)

const { mutate: deleteProcess } = useMutation(deleteProcessMutation)
const showDelete = ref(false)

const doDelete = async () => {
  await deleteProcess({ input: { id: props.id, changeID: selectedChange.value } })
  navigateTo('/processes')
}
</script>
