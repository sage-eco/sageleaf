<script setup lang="ts">
import { ChevronRight as ChevronRightIcon, Tags as TagsIcon } from '@lucide/vue'

defineProps<{
  variants?: Array<{
    id: string
    name?: string | null
    imageURL?: string | null
    recycleScore?: {
      score?: number | null
      rating?: string | null
      ratingF?: string | null
    } | null
    orgs?: {
      nodes: Array<{ org: { name?: string | null } }>
    } | null
  }> | null
  loading?: boolean
}>()

const isOpen = ref(false)
</script>

<template>
  <div class="mt-4">
    <!-- Section header -->
    <div class="flex items-center justify-between px-4 pb-3">
      <h3 class="text-xs font-semibold tracking-wider uppercase opacity-50">Refine by Variant</h3>
      <button
        v-if="variants?.length"
        class="flex items-center gap-1 text-xs font-medium text-primary"
        @click="isOpen = true"
      >
        See all {{ variants.length }}
        <ChevronRightIcon :size="12" />
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-2">
      <div class="h-44 w-36 shrink-0 skeleton rounded-2xl" />
      <div class="h-44 w-36 shrink-0 skeleton rounded-2xl" />
      <div class="h-44 w-36 shrink-0 skeleton rounded-2xl" />
    </div>

    <!-- Carousel -->
    <div
      v-else-if="variants?.length"
      class="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2"
    >
      <button
        v-for="variant in variants"
        :key="variant.id"
        class="w-36 shrink-0 snap-start rounded-2xl border border-base-200 bg-base-100 p-3 text-left shadow-sm transition-colors hover:bg-base-200/50"
        @click="isOpen = true"
      >
        <!-- Image + Score -->
        <div class="mb-2 flex items-start justify-between gap-1">
          <div class="size-16 shrink-0 overflow-hidden rounded-xl bg-base-200">
            <UiImage v-if="variant.imageURL" :src="variant.imageURL" fit="cover" alt="" />
            <div v-else class="flex h-full items-center justify-center">
              <TagsIcon :size="18" class="opacity-30" />
            </div>
          </div>
          <div class="size-10 shrink-0">
            <ScoreGauge
              :score="variant.recycleScore?.score"
              :rating="variant.recycleScore?.rating"
              :rating-f="variant.recycleScore?.ratingF"
            />
          </div>
        </div>
        <!-- Name -->
        <p class="line-clamp-2 text-xs leading-tight font-semibold">{{ variant.name }}</p>
        <!-- Org -->
        <p v-if="variant.orgs?.nodes?.length" class="mt-0.5 line-clamp-1 text-[10px] opacity-50">
          {{ variant.orgs.nodes.map((o) => o.org.name).join(', ') }}
        </p>
      </button>
    </div>
  </div>

  <!-- Full Variants Drawer -->
  <Drawer v-model:open="isOpen">
    <DrawerContent class="flex max-h-[85vh] flex-col">
      <DrawerHeader>
        <DrawerTitle>Variants</DrawerTitle>
      </DrawerHeader>
      <div class="flex-1 overflow-y-auto px-4 pb-8">
        <NuxtLink
          v-for="variant in variants"
          :key="variant.id"
          :to="`/explore/variants/${variant.id}`"
          class="flex items-center gap-3 rounded-lg py-2 active:bg-base-200"
          @click="isOpen = false"
        >
          <span
            v-if="!variant.imageURL"
            class="flex size-12 shrink-0 items-center justify-center rounded-md border border-base-300 bg-base-200"
          >
            <TagsIcon :size="18" class="opacity-30" />
          </span>
          <UiImage v-else class="size-12 shrink-0 rounded-md" :src="variant.imageURL" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold">{{ variant.name }}</p>
            <p v-if="variant.orgs?.nodes?.length" class="truncate text-xs opacity-60">
              {{ variant.orgs.nodes.map((o) => o.org.name).join(', ') }}
            </p>
          </div>
          <div class="size-10 shrink-0">
            <ScoreGauge
              :score="variant.recycleScore?.score"
              :rating="variant.recycleScore?.rating"
              :rating-f="variant.recycleScore?.ratingF"
            />
          </div>
        </NuxtLink>
      </div>
    </DrawerContent>
  </Drawer>
</template>
