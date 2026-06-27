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
          <CardTitle>Child Materials</CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <ModelListMaterial
              v-for="child in entity.children?.nodes ?? []"
              :key="child.id"
              :material="child"
              :on-row-click="() => navigateTo(`/materials/${child.id}`)"
            />
          </ul>
          <div v-if="!entity.children?.nodes?.length" class="text-sm opacity-60">None</div>
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

const props = defineProps<{
  id: string
  mode?: 'page' | 'panel'
}>()

const emit = defineEmits<{ close: [] }>()

const detailQuery = graphql(`
  query MaterialDetail($id: ID!) {
    material(id: $id) {
      id
      name
      desc
      shape
      technical
      createdAt
      updatedAt
      parents(first: 20) {
        nodes {
          id
          ...ListMaterialFragment
        }
      }
      children(first: 50) {
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
</script>
