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
              navigateTo(`/places/${id}`)
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
          <div class="flex flex-col gap-1.5">
            <div v-if="entity.name"><span class="font-semibold">Name:</span> {{ entity.name }}</div>
            <div v-if="entity.desc">
              <span class="font-semibold">Description:</span> {{ entity.desc }}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card v-if="entity.address" class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <MapPinIcon class="size-4 text-base-content/60" />
            Address
          </CardTitle>
        </CardHeader>
        <CardContent>
          <address class="text-sm leading-relaxed not-italic">
            <div v-if="entity.address.street || entity.address.housenumber">
              {{ [entity.address.street, entity.address.housenumber].filter(Boolean).join(' ') }}
            </div>
            <div v-if="entity.address.city || entity.address.postcode">
              {{ [entity.address.postcode, entity.address.city].filter(Boolean).join(' ') }}
            </div>
            <div v-if="entity.address.region">{{ entity.address.region }}</div>
            <div v-if="entity.address.country" class="font-medium">
              {{ entity.address.country }}
            </div>
          </address>
        </CardContent>
      </Card>

      <Card v-if="entity.location" class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <NavigationIcon class="size-4 text-base-content/60" />
            Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="flex flex-col gap-1 text-sm">
            <div>
              <span class="font-semibold">Latitude:</span>
              {{ entity.location.latitude.toFixed(6) }}
            </div>
            <div>
              <span class="font-semibold">Longitude:</span>
              {{ entity.location.longitude.toFixed(6) }}
            </div>
            <div class="mt-2">
              <a
                :href="`https://www.google.com/maps?q=${entity.location.latitude},${entity.location.longitude}`"
                target="_blank"
                rel="noopener noreferrer"
                class="link text-sm link-primary"
              >
                View on Google Maps ↗
              </a>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card v-if="entity.org" class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <BuildingIcon class="size-4 text-base-content/60" />
            Organization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul class="list">
            <ModelListOrg :org="entity.org" :href="`/orgs/${entity.org.id}`" />
          </ul>
        </CardContent>
      </Card>

      <Card v-if="entity.tags?.nodes?.length" class="m-3 border-0 bg-base-100 shadow-md">
        <CardHeader>
          <CardTitle class="flex items-center gap-2">
            <TagIcon class="size-4 text-base-content/60" />
            Tags
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div class="flex flex-wrap gap-2">
            <span v-for="tag in entity.tags.nodes" :key="tag.id" class="badge badge-outline">
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
import {
  ArrowLeft,
  BuildingIcon,
  MapPinIcon,
  Maximize2,
  NavigationIcon,
  TagIcon,
  X,
} from '@lucide/vue'

import { graphql } from '~/gql'

const props = defineProps<{
  id: string
  mode?: 'page' | 'panel'
}>()

const emit = defineEmits<{ close: [] }>()

const detailQuery = graphql(`
  query PlaceDetail($id: ID!) {
    place(id: $id) {
      id
      name
      desc
      createdAt
      updatedAt
      address {
        street
        housenumber
        city
        postcode
        region
        country
      }
      location {
        latitude
        longitude
      }
      org {
        id
        ...ListOrgFragment
      }
      tags {
        nodes {
          id
          name
        }
      }
    }
  }
`)

const { result } = useQuery(detailQuery, () => ({ id: props.id }))
const entity = computed(() => result.value?.place ?? null)
</script>
