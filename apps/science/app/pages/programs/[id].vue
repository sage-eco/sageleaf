<template>
  <div>
    <div class="flex items-start gap-3 p-3">
      <Button variant="ghost" @click="router.back()">
        <ArrowLeft class="size-4" />
      </Button>
      <div class="flex-1">
        <h1 class="flex items-center gap-2 text-xl font-bold">
          <span>{{ entity?.name ?? id }}</span>
          <span v-if="entity?.status" class="badge" :class="statusBadgeClass">{{
            entity.status
          }}</span>
        </h1>
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
    </div>

    <div v-if="!isChangeSelected" role="alert" class="mx-3 mb-3 alert alert-warning">
      <span>Select a change from the sidebar to edit.</span>
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
          <div v-if="entity.region">
            <span class="font-semibold">Region:</span>
            <NuxtLink :to="`/regions/${entity.region.id}`" class="ml-1 link link-primary">
              {{ entity.region.name }}
            </NuxtLink>
          </div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Processes</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <ModelListProcess
              v-for="process in entity.processes?.nodes ?? []"
              :key="process.id"
              :process="process"
              :href="`/processes/${process.id}`"
            />
          </ul>
          <div v-if="!entity.processes?.nodes?.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="space-y-1">
            <li v-for="org in entity.orgs?.nodes ?? []" :key="org.id" class="text-sm">
              {{ org.name }}
            </li>
          </ul>
          <div v-if="!entity.orgs?.nodes?.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>

      <Card v-if="entity.tags?.nodes?.length" class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Tags</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="tag in entity.tags.nodes"
              :key="tag.id"
              class="badge badge-outline"
              :style="
                tag.bgColor ? { backgroundColor: tag.bgColor, borderColor: tag.bgColor } : undefined
              "
            >
              {{ tag.name }}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>

    <div v-else class="flex justify-center p-8">
      <span class="loading loading-lg loading-spinner" />
    </div>

    <Dialog v-model:open="showEdit">
      <DialogContent class="max-h-[80vh] overflow-auto sm:max-w-[70vw]">
        <DialogTitle>Edit Program</DialogTitle>
        <ModelForm
          :change-id="selectedChange"
          :model-id="id"
          :schema-query="programSchema"
          :create-mutation="createProgramMutation"
          :update-mutation="updateProgramMutation"
          :create-model-key="'program'"
          @saved="showEdit = false"
        />
      </DialogContent>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Pencil } from '@lucide/vue'

import { graphql } from '~/gql'

const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const { requireAuth } = useRequireAuth()

const changeStore = useChangeStore()
const { selectedChange, isChangeSelected } = storeToRefs(changeStore)

const detailQuery = graphql(`
  query ProgramDetail($id: ID!) {
    program(id: $id) {
      id
      name
      desc
      status
      createdAt
      updatedAt
      region {
        id
        name
      }
      orgs(first: 10) {
        nodes {
          id
          name
        }
      }
      processes(first: 20) {
        nodes {
          id
          ...ListProcessFragment
        }
      }
      tags(first: 20) {
        nodes {
          id
          name
          bgColor
        }
      }
    }
  }
`)

const { result } = useQuery(detailQuery, { id })
const entity = computed(() => result.value?.program ?? null)

const programSchema = graphql(`
  query ProgramDetailSchema {
    programSchema {
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

const createProgramMutation = graphql(`
  mutation CreateProgramFromDetail($input: CreateProgramInput!) {
    createProgram(input: $input) {
      program {
        id
        name
      }
    }
  }
`)

const updateProgramMutation = graphql(`
  mutation UpdateProgramFromDetail($input: UpdateProgramInput!) {
    updateProgram(input: $input) {
      program {
        id
        name
      }
    }
  }
`)

const showEdit = ref(false)

const statusBadgeClass = computed(() => {
  switch (entity.value?.status) {
    case 'ACTIVE':
      return 'badge-success'
    case 'PLANNED':
      return 'badge-warning'
    case 'CLOSED':
      return 'badge-ghost'
    default:
      return 'badge-outline'
  }
})
</script>
