<template>
  <div>
    <div
      class="fixed top-[env(safe-area-inset-top)] z-10 m-4 flex w-[calc(100vw-70px)] max-w-2xl rounded-full bg-white text-black shadow-md focus-visible:outline-hidden"
    >
      <span class="flex items-center justify-center px-2">
        <Search class="mx-2 text-neutral-700" />
      </span>
      <input
        id="search"
        v-model="searchInput"
        type="text"
        placeholder="Search..."
        class="w-full p-2"
      />
    </div>
    <div class="map-wrap">
      <div ref="mapContainer" class="map" />
    </div>
    <Drawer v-model:open="openDetails" :set-background-color-on-scale="false">
      <DrawerContent class="min-h-[50vh] p-3">
        <DrawerHeader class="text-left">
          <DrawerTitle>{{ selectedPlace?.name }}</DrawerTitle>
          <DrawerDescription class="sr-only">Place details</DrawerDescription>
        </DrawerHeader>
        <h3 class="text-md font-semibold">{{ selectedPlace?.desc }}</h3>
        <p>{{ selectedPlace?.tags }}</p>
        <NuxtLink :to="`/explore/places/${selectedPlace?.id}`" class="p-4">
          <Button class="w-full">View Details</Button>
        </NuxtLink>
        <button
          v-if="selectedPlace?.location"
          type="button"
          class="px-4"
          @click="openUrl(mapsLink(selectedPlace.location))"
        >
          <Button class="w-full" variant="outline"
            >Open in Maps
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M14 3v2h3.59l-9.83 9.83l1.41 1.41L19 6.41V10h2V3m-2 16H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2z"
              />
            </svg>
          </Button>
        </button>
      </DrawerContent>
    </Drawer>
  </div>
</template>

<script setup lang="ts">
import { Search } from '@lucide/vue'
import { watchDebounced } from '@vueuse/core'
import maplibregl, { Map, NavigationControl, type LngLatLike } from 'maplibre-gl'
import type { ShallowRef } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

import { graphql } from '~/gql'
import type { Place } from '~/gql/types.generated'

useTopbar(null)

const mapsLink = useMapsLink()
const { openUrl } = useOpenUrl()

const searchInput = ref('')
const openDetails = ref(false)
const selectedPlace = ref<Place | null>(null)

const regionStore = useRegionStore()
await regionStore.load()
const regionQuery = graphql(`
  query PlacesIndexRegionQuery($id: ID!) {
    region(id: $id) {
      id
      name
      placetype
      bbox
      minZoom
    }
  }
`)
const { data: regionData } = await useAsyncQuery(regionQuery, {
  id: regionStore.selectedRegion,
})

const mapContainer = shallowRef(null)
const map: ShallowRef<Map | null> = shallowRef(null)

const mapBounds = ref<[number, number][] | null>(null)

const placeSearch = graphql(`
  query PlaceSearch($search: String!, $latLong: [Float!]) {
    search(query: $search, types: [PLACE], latlong: $latLong, limit: 100) {
      nodes {
        ... on Place {
          id
          name
          address {
            city
          }
          location {
            latitude
            longitude
          }
        }
      }
      totalCount
    }
  }
`)
const search = useQuery(placeSearch, {
  search: searchInput.value,
  latLong: [
    mapBounds.value?.[1]?.[1] || 0,
    mapBounds.value?.[1]?.[0] || 0,
    mapBounds.value?.[0]?.[1] || 0,
    mapBounds.value?.[0]?.[0] || 0,
  ],
})
let markers: Pick<maplibregl.Marker, 'remove'>[] = []

watch(
  () => search.result.value,
  () => {
    if (map.value && search.result.value && search.result.value.search.nodes) {
      markers.forEach((marker) => {
        marker.remove()
      })
      markers = []
      search.result.value.search.nodes.forEach((place) => {
        if (place.__typename !== 'Place' || !place.location) {
          return
        }
        const el = document.createElement('div')
        el.className = 'text-primary'
        el.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path fill="currentColor" d="M12 11.5A2.5 2.5 0 0 1 9.5 9A2.5 2.5 0 0 1 12 6.5A2.5 2.5 0 0 1 14.5 9a2.5 2.5 0 0 1-2.5 2.5M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7"/></svg>
        `
        const marker = new maplibregl.Marker({
          color: '#005d58',
          element: el,
        })
          .setLngLat([place.location.longitude, place.location.latitude])
          .addTo(map.value!)
        markers.push(marker)
        marker.getElement().addEventListener('click', (e: Event) => {
          e.stopPropagation()
          e.preventDefault()
          openDetails.value = true
          selectedPlace.value = place as Place
        })
      })
    }
  },
)

const refreshSearch = (newSearch: string) => {
  if (!mapBounds.value) {
    return
  }
  search.refetch({
    search: newSearch,
    latLong: [
      mapBounds.value[1]?.[1] || 0,
      mapBounds.value[1]?.[0] || 0,
      mapBounds.value[0]?.[1] || 0,
      mapBounds.value[0]?.[0] || 0,
    ],
  })
}
const refreshBounds = (newBounds: [number, number][] | null) => {
  if (!newBounds) {
    return
  }
  search.refetch({
    search: searchInput.value,
    latLong: [
      newBounds[1]?.[1] || 0,
      newBounds[1]?.[0] || 0,
      newBounds[0]?.[1] || 0,
      newBounds[0]?.[0] || 0,
    ],
  })
}

watchDebounced(searchInput, refreshSearch, { debounce: 300 })
watchDebounced(mapBounds, refreshBounds, {
  debounce: 300,
})

onMounted(() => {
  if (!mapContainer.value) {
    return
  }
  const bbox = regionData.value?.region?.bbox
  const center: LngLatLike =
    bbox && bbox.length === 4 && bbox[0] && bbox[1] && bbox[2] && bbox[3]
      ? [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2]
      : [0, 0]
  map.value = new Map({
    container: mapContainer.value,
    style: '/map-style-light.json',
    center,
    zoom: regionData.value?.region?.minZoom || 10,
    attributionControl: false,
  })
  map.value.addControl(new NavigationControl(), 'top-right')
  map.value.addControl(new maplibregl.AttributionControl(), 'bottom-left')
  if (bbox && bbox[0] === bbox[2]) {
    map.value.setCenter(center)
  } else {
    map.value.fitBounds(
      bbox && bbox.length === 4 && bbox[0] && bbox[1] && bbox[2] && bbox[3]
        ? [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]],
          ]
        : [
            [-180, -90],
            [180, 90],
          ],
      {
        padding: { top: 20, bottom: 20, left: 20, right: 20 },
        linear: true,
      },
    )
  }
  const getBounds = () => {
    if (!map.value) {
      return null
    }
    mapBounds.value = map.value.getBounds().toArray()
  }
  getBounds()
  map.value.on('moveend', getBounds)
})

onBeforeRouteLeave(() => {
  if (map.value) {
    map.value.remove()
    map.value = null
  }
})

onUnmounted(() => {
  if (map.value) {
    map.value.remove()
  }
})
</script>

<style scoped>
.map-wrap {
  position: relative;
  width: 100%;
  height: calc(100vh - 64px); /* calculate height of the screen minus the nav bar */
}

.map {
  position: absolute;
  width: 100%;
  height: 100%;
}

.watermark {
  position: absolute;
  left: 10px;
  bottom: 10px;
  z-index: 999;
}
</style>

<style>
.maplibregl-ctrl-bottom-left {
  z-index: 0 !important;
}
.maplibregl-ctrl-attrib {
  opacity: 0.8 !important;
}
</style>
