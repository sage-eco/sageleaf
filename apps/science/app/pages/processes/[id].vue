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
          <table class="table w-full table-sm">
            <tbody>
              <tr v-if="entity.material">
                <td class="font-semibold">Material</td>
                <td>{{ entity.material.name }}</td>
              </tr>
              <tr v-if="entity.org">
                <td class="font-semibold">Organization</td>
                <td>{{ entity.org.name }}</td>
              </tr>
              <tr v-if="entity.place">
                <td class="font-semibold">Place</td>
                <td>{{ entity.place.name }}</td>
              </tr>
              <tr v-if="entity.region">
                <td class="font-semibold">Region</td>
                <td>
                  <div>{{ entity.region.name }}</div>
                  <div v-if="entity.region.desc" class="text-xs opacity-60">
                    {{ entity.region.desc }}
                  </div>
                </td>
              </tr>
              <tr v-if="entity.variant">
                <td class="font-semibold">Variant</td>
                <td>
                  <NuxtLink :to="`/variants/${entity.variant.id}`" class="link link-primary">
                    {{ entity.variant.name }}
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
          <div
            v-if="
              !entity.material && !entity.org && !entity.place && !entity.region && !entity.variant
            "
            class="text-sm opacity-60"
          >
            None
          </div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Sources</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="space-y-2">
            <li
              v-for="ps in entity.sources?.nodes ?? []"
              :key="ps.source.id"
              class="flex items-center gap-2 text-sm"
            >
              <span class="badge badge-outline badge-sm">{{ ps.source.type }}</span>
              <a
                v-if="ps.source.contentURL"
                :href="ps.source.contentURL"
                target="_blank"
                class="max-w-xs link truncate link-primary"
                >{{ ps.source.contentURL }}</a
              >
              <NuxtLink :to="`/sources/${ps.source.id}`" class="link text-xs link-secondary"
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
        <DialogTitle>Edit Process</DialogTitle>
        <ModelForm
          :change-id="selectedChange"
          :model-id="id"
          :schema-query="processSchema"
          :create-mutation="createProcessMutation"
          :update-mutation="updateProcessMutation"
          :create-model-key="'process'"
          @saved="showEdit = false"
        />
      </DialogContent>
    </Dialog>

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
import { ArrowLeft, Pencil, Trash2 } from '@lucide/vue'

import { graphql } from '~/gql'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const { requireAuth } = useRequireAuth()

const changeStore = useChangeStore()
const { selectedChange, isChangeSelected } = storeToRefs(changeStore)

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
        name
      }
      org {
        id
        name
      }
      place {
        id
        name
      }
      region {
        id
        name
        desc
      }
      variant {
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
    }
  }
`)

const { result } = useQuery(detailQuery, { id })
const entity = computed(() => result.value?.process ?? null)

const processSchema = graphql(`
  query ProcessDetailSchema {
    processSchema {
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

const createProcessMutation = graphql(`
  mutation CreateProcessFromDetail($input: CreateProcessInput!) {
    createProcess(input: $input) {
      process {
        id
        name
      }
    }
  }
`)

const updateProcessMutation = graphql(`
  mutation UpdateProcessFromDetail($input: UpdateProcessInput!) {
    updateProcess(input: $input) {
      process {
        id
        name
      }
    }
  }
`)

const deleteProcessMutation = graphql(`
  mutation DeleteProcessFromDetail($input: DeleteInput!) {
    deleteProcess(input: $input) {
      success
    }
  }
`)

const { mutate: deleteProcess } = useMutation(deleteProcessMutation)

const showEdit = ref(false)
const showDelete = ref(false)

const doDelete = async () => {
  await deleteProcess({ input: { id, changeID: selectedChange.value } })
  navigateTo('/processes')
}
</script>
