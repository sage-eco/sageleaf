<template>
  <div class="flex justify-center">
    <div class="w-full max-w-2xl px-5 pt-4">
      <ul class="list rounded-box bg-base-200 shadow-md">
        <template v-if="loading && !data">
          <li v-for="n in 8" :key="n" class="list-row flex items-center gap-2 py-3">
            <div class="flex-1 space-y-2 px-2">
              <div class="h-4 w-36 skeleton" />
              <div class="h-3 w-20 skeleton" />
              <div class="h-3 w-full skeleton" />
            </div>
          </li>
        </template>
        <li v-for="program in allPrograms" :key="program.id">
          <NuxtLink :to="`/explore/programs/${program.id}`">
            <div class="list-row flex items-center gap-2 py-3">
              <div class="flex-1 px-2">
                <div class="font-medium">{{ program.name }}</div>
                <div v-if="program.region?.name" class="text-xs opacity-50">
                  {{ program.region.name }}
                </div>
                <div v-if="program.desc" class="mt-0.5 line-clamp-2 text-xs opacity-70">
                  {{ program.desc }}
                </div>
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
import { ChevronRight as ChevronRightIcon } from '@lucide/vue'
import { useIntersectionObserver } from '@vueuse/core'

import { graphql } from '~/gql'

useTopbar({ title: 'Programs', back: 'true' })

const PAGE_SIZE = 20

const programsQuery = graphql(`
  query ProgramsIndexGetPrograms($first: Int!, $after: String) {
    programs(first: $first, after: $after) {
      nodes {
        id
        name
        desc
        region {
          name
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`)

const { result: data, loading, fetchMore } = useQuery(programsQuery, { first: PAGE_SIZE })

const allPrograms = ref<
  { id: string; name: string; desc?: string | null; region?: { name?: string | null } | null }[]
>([])

watch(
  data,
  (val) => {
    if (val) allPrograms.value = [...val.programs.nodes]
  },
  { immediate: true },
)

const hasMore = computed(() => data.value?.programs.pageInfo.hasNextPage ?? false)

const loadMoreTarget = useTemplateRef('loadMoreTarget')
useIntersectionObserver(loadMoreTarget, ([entry]) => {
  if (entry?.isIntersecting && hasMore.value && !loading.value) {
    fetchMore({
      variables: { first: PAGE_SIZE, after: data.value?.programs.pageInfo.endCursor },
      updateQuery(prev, { fetchMoreResult }) {
        if (!fetchMoreResult) return prev
        allPrograms.value = [...allPrograms.value, ...fetchMoreResult.programs.nodes]
        return {
          programs: {
            ...fetchMoreResult.programs,
            nodes: allPrograms.value,
          },
        }
      },
    })
  }
})
</script>
