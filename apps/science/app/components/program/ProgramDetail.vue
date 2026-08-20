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
              navigateTo(`/programs/${id}`)
            }
          "
        >
          <Maximize2 class="size-4" />
        </Button>
      </template>
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
      <template v-if="mode === 'page'">
        <Button
          :disabled="!isChangeSelected"
          @click="requireAuth(() => navigateTo(`/programs/${id}/edit`))"
        >
          <Pencil class="size-4" />
          Edit
        </Button>
      </template>
    </div>

    <div
      v-if="mode === 'page' && !isChangeSelected"
      role="alert"
      class="mx-3 mb-3 alert alert-warning"
    >
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
          <CardTitle class="flex items-center justify-between">
            <span>Processes</span>
            <GridPagerButtons
              :has-previous-page="processesPager.hasPreviousPage.value"
              :has-next-page="processesPager.hasNextPage.value"
              @prev="processesPager.prevPage"
              @next="processesPager.nextPage"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <ModelListProcess
              v-for="process in processesPager.nodes.value"
              :key="process.id"
              :process="process"
              :on-row-click="() => panelStore.openPanel('process', process.id)"
            />
          </ul>
          <div v-if="!processesPager.nodes.value.length" class="text-sm opacity-60">None</div>
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
              v-for="org in orgsPager.nodes.value"
              :key="org.id"
              :org="org"
              :on-row-click="() => panelStore.openPanel('org', org.id)"
            />
          </ul>
          <div v-if="!orgsPager.nodes.value.length" class="text-sm opacity-60">None</div>
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
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Maximize2, Pencil, X } from '@lucide/vue'

import { graphql } from '~/gql'
import { useDetailPanelStore } from '~/stores/detail_panel_store'

const props = defineProps<{
  id: string
  mode?: 'page' | 'panel'
}>()

const emit = defineEmits<{ close: [] }>()

const { requireAuth } = useRequireAuth()
const changeStore = useChangeStore()
const { isChangeSelected } = storeToRefs(changeStore)
const panelStore = useDetailPanelStore()

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

const { result } = useQuery(detailQuery, () => ({ id: props.id }))
const entity = computed(() => result.value?.program ?? null)

const programOrgsQuery = graphql(`
  query ProgramOrgs($id: ID!, $first: Int, $last: Int, $after: String, $before: String) {
    program(id: $id) {
      id
      orgs(first: $first, last: $last, after: $after, before: $before) {
        nodes {
          id
          ...ListOrgFragment
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
const orgsPager = useRelationPager(programOrgsQuery, 'program', 'orgs', () => props.id)

const programProcessesQuery = graphql(`
  query ProgramProcesses($id: ID!, $first: Int, $last: Int, $after: String, $before: String) {
    program(id: $id) {
      id
      processes(first: $first, last: $last, after: $after, before: $before) {
        nodes {
          id
          ...ListProcessFragment
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
const processesPager = useRelationPager(
  programProcessesQuery,
  'program',
  'processes',
  () => props.id,
)

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
