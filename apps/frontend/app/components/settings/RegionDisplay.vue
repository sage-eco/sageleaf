<template>
  <div class="card bg-base-100 shadow-md">
    <div class="card-body p-4">
      <div class="flex flex-col gap-0.5 p-2">
        <p class="pb-2 text-xs opacity-60">Selected Region</p>
        <h3 class="text-lg leading-tight font-bold">{{ name }}</h3>
        <p v-if="desc" class="mt-1 text-xs opacity-50">{{ desc }}</p>
      </div>

      <!-- Static map -->
      <div class="map-wrap">
        <div v-if="!mapError" ref="mapContainer" class="map" />
        <div
          v-else
          class="absolute inset-0 z-10 flex items-center justify-center bg-base-200/50 px-3 text-center text-xs text-error"
          role="alert"
        >
          {{ mapError }}
        </div>
        <div v-if="!mapError" class="zoom-controls">
          <button class="zoom-btn" :disabled="!map" @click="map?.zoomIn()">
            <PlusIcon class="size-3.5" />
          </button>
          <button class="zoom-btn" :disabled="!map" @click="map?.zoomOut()">
            <MinusIcon class="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { MinusIcon, PlusIcon } from '@lucide/vue'
import maplibregl, { Map, type ErrorEvent } from 'maplibre-gl'
import type { ShallowRef } from 'vue'

const props = defineProps<{
  name: string
  desc?: string
  bbox?: number[]
  minZoom?: number
}>()

const mapContainer: ShallowRef<HTMLElement | null> = shallowRef(null)
const map: ShallowRef<Map | null> = shallowRef(null)
const mapError = ref<string | null>(null)
const posthog = usePostHog()

function handleMapError(e: ErrorEvent) {
  const err = e.error as { message?: string; status?: number; url?: string }
  const sourceId = (e as { data?: { sourceId?: string } }).data?.sourceId
  posthog?.captureException(new Error(err.message ?? 'MapLibre error'), {
    tags: { feature: 'map' },
    properties: { status: err.status, url: err.url, source_id: sourceId },
  })
  mapError.value = "Couldn't load the map"
}

const initMap = (bbox: number[]) => {
  if (!mapContainer.value) return
  if (map.value) {
    map.value.remove()
    map.value = null
  }
  const m = new Map({
    container: mapContainer.value,
    style: '/map-style-light.json',
    interactive: false,
    attributionControl: false,
  })
  m.addControl(new maplibregl.AttributionControl(), 'bottom-left')
  m.once('load', () => {
    const [west, south, east, north] = bbox as [number, number, number, number]
    if (bbox.length === 4 && west !== east) {
      m.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        { padding: 16, animate: false },
      )
    } else {
      m.setCenter([west, south])
      m.setZoom(props.minZoom ?? 11)
    }
  })
  map.value = m
  m.on('error', handleMapError)
  m.on('idle', () => {
    mapError.value = null
  })
}

watch(
  () => props.bbox,
  (bbox) => {
    if (bbox && mapContainer.value) initMap(bbox)
  },
)

onMounted(() => {
  if (props.bbox && mapContainer.value) initMap(props.bbox)
})

onUnmounted(() => {
  if (map.value) {
    map.value.remove()
    map.value = null
  }
})
</script>

<style scoped>
.map-wrap {
  position: relative;
  width: 100%;
  height: 200px;
  margin-top: 0.5rem;
  border-radius: 0.5rem;
  overflow: hidden;
}

.map {
  position: absolute;
  width: 100%;
  height: 100%;
}

.zoom-controls {
  position: absolute;
  bottom: 8px;
  right: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 1;
}

.zoom-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 4px;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}

.zoom-btn:hover {
  background: #f5f5f5;
}

.zoom-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
</style>
