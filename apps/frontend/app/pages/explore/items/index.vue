<template>
  <div class="flex justify-center">
    <div class="w-full max-w-2xl px-5 pt-4">
      <ul class="list rounded-box bg-base-200 shadow-md">
        <template v-if="loading && !data">
          <li v-for="n in 8" :key="n" class="list-row flex items-center gap-2 py-2">
            <div class="size-14 shrink-0 skeleton rounded-box" />
            <div class="flex-1 space-y-2 px-2">
              <div class="h-4 w-32 skeleton" />
            </div>
          </li>
        </template>
        <li v-for="item in allItems" :key="item.id">
          <NuxtLink :to="`/explore/items/${item.id}`">
            <div class="list-row flex items-center gap-2 py-2">
              <UiImage v-if="item.imageURL" :src="item.imageURL" class="size-14 rounded-box" />
              <span
                v-else
                class="flex size-14 items-center justify-center rounded-box border border-base-300"
              >
                <PackageIcon :size="20" class="opacity-40" />
              </span>
              <div class="flex-1 px-2">
                <div class="font-medium">{{ item.name }}</div>
              </div>
              <ChevronRightIcon class="size-5 opacity-40" />
            </div>
          </NuxtLink>
        </li>
        <li v-if="hasMore" ref="loadMoreTarget" class="flex justify-center py-4">
          <span class="loading loading-sm loading-spinner opacity-40" />
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronRight as ChevronRightIcon, Package as PackageIcon } from '@lucide/vue'
import { useIntersectionObserver } from '@vueuse/core'

import { graphql } from '~/gql'

useTopbar({ title: 'Items', back: 'true' })

const PAGE_SIZE = 20

const itemsQuery = graphql(`
  query ItemsIndexGetItems($first: Int!, $after: String) {
    items(first: $first, after: $after) {
      nodes {
        id
        name
        imageURL
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`)

const { result: data, loading, fetchMore } = useQuery(itemsQuery, { first: PAGE_SIZE })

const allItems = ref<{ id: string; name?: string | null; imageURL?: string | null }[]>([])

watch(
  data,
  (val) => {
    if (val) allItems.value = [...val.items.nodes]
  },
  { immediate: true },
)

const hasMore = computed(() => data.value?.items.pageInfo.hasNextPage ?? false)

const loadMoreTarget = useTemplateRef('loadMoreTarget')
useIntersectionObserver(loadMoreTarget, ([entry]) => {
  if (entry?.isIntersecting && hasMore.value && !loading.value) {
    fetchMore({
      variables: { first: PAGE_SIZE, after: data.value?.items.pageInfo.endCursor },
      updateQuery(prev, { fetchMoreResult }) {
        if (!fetchMoreResult) return prev
        allItems.value = [...allItems.value, ...fetchMoreResult.items.nodes]
        return {
          items: {
            ...fetchMoreResult.items,
            nodes: allItems.value,
          },
        }
      },
    })
  }
})
</script>
