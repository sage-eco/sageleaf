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
              navigateTo(`/materials/${id}`)
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
    </div>

    <div v-if="entity">
      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <table class="table w-full">
            <tbody>
              <tr>
                <td class="font-semibold">Name</td>
                <td>{{ entity.name }}</td>
              </tr>
              <tr v-if="entity.desc">
                <td class="font-semibold">Description</td>
                <td>{{ entity.desc }}</td>
              </tr>
              <tr v-if="entity.shape">
                <td class="font-semibold">Shape</td>
                <td>{{ entity.shape }}</td>
              </tr>
              <tr v-if="entity.synonyms?.length">
                <td class="font-semibold">Synonyms</td>
                <td>{{ entity.synonyms.join(', ') }}</td>
              </tr>
              <tr>
                <td class="font-semibold">Technical</td>
                <td>{{ entity.technical ? 'Yes' : 'No' }}</td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle>Parent Materials</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <ModelListMaterial
              v-for="parent in entity.parents?.nodes ?? []"
              :key="parent.id"
              :material="parent"
              :on-row-click="() => navigateTo(`/materials/${parent.id}`)"
            />
          </ul>
          <div v-if="!entity.parents?.nodes?.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>

      <Card class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle class="flex items-center justify-between">
            <span>Child Materials</span>
            <GridPagerButtons
              :has-previous-page="childrenPager.hasPreviousPage.value"
              :has-next-page="childrenPager.hasNextPage.value"
              @prev="childrenPager.prevPage"
              @next="childrenPager.nextPage"
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <ModelListMaterial
              v-for="child in childrenPager.nodes.value"
              :key="child.id"
              :material="child"
              :on-row-click="() => navigateTo(`/materials/${child.id}`)"
            />
          </ul>
          <div v-if="!childrenPager.nodes.value.length" class="text-sm opacity-60">None</div>
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
          <CardTitle>Related Materials</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <ModelListMaterial
              v-for="mat in entity.related?.nodes ?? []"
              :key="mat.id"
              :material="mat"
              :on-row-click="() => panelStore.openPanel('material', mat.id)"
            />
          </ul>
          <div v-if="!entity.related?.nodes?.length" class="text-sm opacity-60">None</div>
        </CardContent>
      </Card>
    </div>

    <div v-else class="flex justify-center p-8">
      <span class="loading loading-lg loading-spinner" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, Maximize2, X } from '@lucide/vue'

import { graphql } from '~/gql'
import { useDetailPanelStore } from '~/stores/detail_panel_store'

const props = defineProps<{
  id: string
  mode?: 'page' | 'panel'
}>()

const emit = defineEmits<{ close: [] }>()

const panelStore = useDetailPanelStore()

const detailQuery = graphql(`
  query MaterialDetail($id: ID!) {
    material(id: $id) {
      id
      name
      desc
      shape
      technical
      synonyms
      createdAt
      updatedAt
      parents(first: 20) {
        nodes {
          id
          ...ListMaterialFragment
        }
      }
      related(limit: 10) {
        nodes {
          id
          ...ListMaterialFragment
        }
      }
    }
  }
`)

const { result } = useQuery(detailQuery, () => ({ id: props.id }))
const entity = computed(() => result.value?.material ?? null)

const materialChildrenQuery = graphql(`
  query MaterialChildren($id: ID!, $first: Int, $last: Int, $after: String, $before: String) {
    material(id: $id) {
      id
      children(first: $first, last: $last, after: $after, before: $before) {
        nodes {
          id
          ...ListMaterialFragment
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
const childrenPager = useRelationPager(
  materialChildrenQuery,
  'material',
  'children',
  () => props.id,
)

const materialProcessesQuery = graphql(`
  query MaterialProcesses($id: ID!, $first: Int, $last: Int, $after: String, $before: String) {
    material(id: $id) {
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
  materialProcessesQuery,
  'material',
  'processes',
  () => props.id,
)
</script>
