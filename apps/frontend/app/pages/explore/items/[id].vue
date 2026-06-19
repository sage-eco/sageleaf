<template>
  <div class="relative min-h-screen bg-base-100">
    <!-- Fixed Top Bar -->
    <div class="fixed inset-x-0 top-0 z-50 flex flex-col bg-base-100/80 backdrop-blur-md">
      <div class="relative flex h-16 items-center px-4">
        <NavBackBubble class="static!" />

        <TabsIntentSelector v-model="activeTab" :tabs="tabs" />
      </div>
    </div>

    <!-- Scrollable Content -->
    <div class="pt-20">
      <!-- Hero Card -->
      <div class="no-scrollbar flex w-full snap-x snap-mandatory overflow-x-auto pt-2 pb-6">
        <div class="w-[75%] shrink-0 snap-center pr-2 pl-4">
          <div
            class="flex w-full flex-col rounded-3xl border border-base-200 bg-base-100 p-5 shadow-[inset_0_4px_12px_rgba(0,0,0,0.15)]"
          >
            <!-- Top Row: Image and ScoreGauge horizontally aligned -->
            <div class="flex items-center gap-6">
              <!-- Item image -->
              <div
                class="relative size-20 shrink-0 overflow-hidden rounded-sm bg-base-200 shadow-md"
              >
                <UiImage v-if="data?.item?.imageURL" :src="data.item.imageURL" fit="cover" alt="" />
                <div v-else class="flex h-full items-center justify-center">
                  <PackageIcon :size="24" class="opacity-20" />
                </div>
              </div>

              <!-- ScoreGauge horizontally in line with image -->
              <div class="h-20 w-20 shrink-0">
                <div v-if="loadingRecycling" class="size-16 skeleton rounded-full"></div>
                <ScoreGauge
                  v-else-if="recyclingResult"
                  class="origin-top-left"
                  :score="recyclingResult.item?.recycleScore?.score"
                  :rating="recyclingResult.item?.recycleScore?.rating"
                  :rating-f="recyclingResult.item?.recycleScore?.ratingF"
                />
              </div>
            </div>

            <!-- Bottom Row: Title Area -->
            <div class="mt-4 space-y-2">
              <h1 class="line-clamp-2 text-base leading-tight font-bold">
                {{ data?.item?.name }}
              </h1>
              <div v-if="vars.id" class="-ml-1">
                <FeedbackVoteButtons
                  :entity-name="FeedbackEntityName.Item"
                  :entity-id="vars.id"
                  :related-ids="{ itemId: vars.id }"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Placeholder card (25% width) -->
        <div class="w-[25%] shrink-0 snap-center pr-4 pl-2">
          <div
            class="flex h-full min-h-44 w-full items-center justify-center rounded-3xl border-2 border-dashed border-base-300 bg-base-100/50 text-base-content/30 transition-colors hover:bg-base-200/50 hover:text-base-content/50"
          >
            <PlusIcon :size="32" />
          </div>
        </div>
      </div>

      <!-- Content Area -->
      <div class="relative z-0 bg-base-100 pb-4">
        <ItemVariantsDrawer
          :loading="loadingVariants"
          :variants="variantsResult?.item?.variants?.nodes"
        />

        <!-- Description (optional) -->
        <div v-if="data?.item?.desc" class="px-4 pb-4">
          <p class="text-sm text-base-content/70">
            {{ data.item.desc }}
          </p>
        </div>

        <!-- Tab content -->
        <div>
          <!-- Reuse -->
          <div v-if="activeTab === 'reuse'">
            <ComponentReuseStreams
              :entity-name="FeedbackEntityName.Item"
              :entity-id="vars.id"
              :related-ids="{ itemId: vars.id }"
            />
          </div>
          <!-- Recycle -->
          <div v-if="activeTab === 'recycle'">
            <ItemRecycleStreams
              :loading="loadingRecycling"
              :recycle="recyclingResult?.item?.recycle"
              :entity-id="vars.id"
              :related-ids="{ itemId: vars.id }"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Package as PackageIcon,
  Plus as PlusIcon,
  Recycle as RecycleIcon,
  RefreshCw as RefreshCwIcon,
} from '@lucide/vue'

import { graphql } from '~/gql'
import { FeedbackEntityName } from '~/gql/types.generated'

const route = useRoute()

useTopbar(null)

const activeTab = ref<'reuse' | 'recycle'>('recycle')
const tabs = [
  { id: 'reuse', label: 'Reuse', icon: RefreshCwIcon },
  { id: 'recycle', label: 'Recycle', icon: RecycleIcon },
]

const itemQuery = graphql(`
  query GetItem($id: ID!) {
    item(id: $id) {
      id
      name
      desc
      imageURL
    }
  }
`)

const itemRecycling = graphql(`
  query GetItemRecycling($id: ID!) {
    item(id: $id) {
      id
      recycleScore {
        score
        rating
        ratingF
      }
      recycle {
        ...ItemRecycleStreams
      }
    }
  }
`)

const itemVariants = graphql(`
  query GetItemVariants($id: ID!) {
    item(id: $id) {
      id
      variants {
        nodes {
          id
          name
          imageURL
          recycleScore {
            score
            rating
            ratingF
          }
          orgs {
            nodes {
              org {
                name
              }
            }
          }
        }
      }
    }
  }
`)

const vars = {
  id: typeof route.params.id === 'string' ? route.params.id : route.params.id?.[0] || '',
}

const { result: data } = useQuery(itemQuery, vars)

const recentStore = useRecentStore()

const regionStore = useRegionStore()
regionStore.load()

const {
  result: recyclingResult,
  load: loadRecycling,
  loading: loadingRecycling,
} = useLazyQuery(itemRecycling, vars)

const {
  result: variantsResult,
  load: loadVariants,
  loading: loadingVariants,
} = useLazyQuery(itemVariants, vars)

onMounted(async () => {
  recentStore.add({ id: vars.id, __typename: 'Item' })
  await loadVariants()
})

watch(
  activeTab,
  async (tab) => {
    if (tab === 'recycle') {
      await loadRecycling()
    }
  },
  { immediate: true },
)
</script>
