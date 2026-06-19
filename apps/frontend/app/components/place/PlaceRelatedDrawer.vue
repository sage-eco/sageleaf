<script setup lang="ts">
import { ChevronRight as ChevronRightIcon, MapPin as MapPinIcon } from '@lucide/vue'
import { T } from '@tolgee/vue'
import { ref } from 'vue'

defineProps<{
  related?: Array<{
    id: string
    name?: string | null
    address?: { city?: string | null; region?: string | null } | null
  }> | null
  loading?: boolean
}>()

const isOpen = ref(false)
</script>

<template>
  <div v-if="loading || related?.length" class="mt-4">
    <!-- Section header -->
    <div class="flex items-center justify-between px-4 pb-3">
      <h3 class="text-xs font-semibold tracking-wider uppercase opacity-50">
        <T ns="frontend" key-name="place.related" />
      </h3>
      <button
        v-if="related?.length"
        class="flex items-center gap-1 text-xs font-medium text-primary"
        @click="isOpen = true"
      >
        <T ns="common" key-name="cta.seeAll" />
        <ChevronRightIcon :size="14" />
      </button>
    </div>

    <!-- Horizontal carousel -->
    <div
      v-if="related?.length"
      class="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2"
    >
      <NuxtLink
        v-for="place in related"
        :key="place.id"
        :to="`/explore/places/${place.id}`"
        class="w-36 shrink-0 snap-start rounded-2xl border border-base-200 bg-base-100 p-3 text-left shadow-sm transition-colors hover:bg-base-200/50"
      >
        <div class="mb-2 flex items-start gap-1">
          <div
            class="flex size-8 shrink-0 items-center justify-center rounded-md bg-base-200 text-primary"
          >
            <MapPinIcon :size="16" />
          </div>
        </div>
        <p class="line-clamp-2 text-sm font-semibold">{{ place.name }}</p>
        <p
          v-if="place.address?.city || place.address?.region"
          class="mt-0.5 line-clamp-1 text-[10px] opacity-50"
        >
          {{ [place.address?.city, place.address?.region].filter(Boolean).join(', ') }}
        </p>
      </NuxtLink>
    </div>
  </div>

  <!-- See-all drawer -->
  <Drawer v-model:open="isOpen">
    <DrawerContent class="flex max-h-[85vh] flex-col">
      <DrawerHeader>
        <DrawerTitle>
          <T ns="frontend" key-name="place.drawer.title" />
        </DrawerTitle>
      </DrawerHeader>
      <div class="flex-1 overflow-y-auto px-4 pb-8">
        <NuxtLink
          v-for="place in related"
          :key="place.id"
          :to="`/explore/places/${place.id}`"
          class="flex items-center gap-3 rounded-lg py-2 active:bg-base-200"
          @click="isOpen = false"
        >
          <div class="flex size-12 shrink-0 items-center justify-center rounded-md bg-base-200">
            <MapPinIcon :size="18" class="text-primary" />
          </div>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold">{{ place.name }}</p>
            <p
              v-if="place.address?.city || place.address?.region"
              class="truncate text-xs opacity-60"
            >
              {{ [place.address?.city, place.address?.region].filter(Boolean).join(', ') }}
            </p>
          </div>
          <ChevronRightIcon :size="16" class="shrink-0 opacity-30" />
        </NuxtLink>
      </div>
    </DrawerContent>
  </Drawer>
</template>
