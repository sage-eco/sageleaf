<template>
  <div class="relative min-h-screen bg-base-100">
    <NavIntentTopBar>
      <NavBackBubble class="static!" />

      <TabsIntentSelector v-model="activeTab" :tabs="tabs" />
    </NavIntentTopBar>

    <!-- Scrollable Content -->
    <div class="pt-4">
      <!-- Variant Cards Carousel -->
      <div class="no-scrollbar flex w-full snap-x snap-mandatory overflow-x-auto pt-2 pb-6">
        <!-- Main Variant Card -->
        <div class="w-[75%] shrink-0 snap-center pr-2 pl-4">
          <div
            class="flex w-full flex-col rounded-3xl border border-base-200 bg-base-100 p-5 shadow-[inset_0_4px_12px_rgba(0,0,0,0.15)]"
          >
            <!-- Top Row: Image and ScoreGauge horizontally aligned -->
            <div class="flex items-center gap-6">
              <UiImageStack :images="allImages" />

              <!-- ScoreGauge horizontally in line with image -->
              <div class="h-20 w-20 shrink-0">
                <div v-if="loadingRecycling" class="size-16 skeleton rounded-full"></div>
                <ScoreGauge
                  v-else-if="recyclingResult"
                  class="origin-top-left"
                  :score="recyclingResult.variant?.recycleScore?.score"
                  :rating="recyclingResult.variant?.recycleScore?.rating"
                  :rating-f="recyclingResult.variant?.recycleScore?.ratingF"
                />
              </div>
            </div>

            <!-- Bottom Row: Title Area (Aligned with left side of image) -->
            <div class="mt-4 space-y-2">
              <h1 class="line-clamp-2 text-base leading-tight font-bold">
                {{ data?.variant?.name }}
              </h1>
              <p v-if="orgSubtitle" class="line-clamp-1 text-sm opacity-50">
                {{ orgSubtitle }}
              </p>
              <div v-if="vars.id" class="-ml-1">
                <FeedbackVoteButtons
                  :entity-name="FeedbackEntityName.Variant"
                  :entity-id="vars.id"
                  :related-ids="{ variantId: vars.id }"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Add Variant Card (25% width) -->
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
        <!-- Name & desc (optional below cards) -->
        <div v-if="data?.variant?.desc" class="px-4 pb-4">
          <p class="text-sm text-base-content/70">
            {{ data?.variant?.desc }}
          </p>
        </div>

        <!-- Tab content -->
        <div>
          <!-- Reuse -->
          <div v-if="activeTab === 'reuse'">
            <ComponentReuseStreams
              :entity-name="FeedbackEntityName.Variant"
              :entity-id="vars.id"
              :related-ids="{ variantId: vars.id }"
            />
          </div>
          <!-- Recycle -->
          <div v-if="activeTab === 'recycle'">
            <ComponentRecycleStreams
              :loading="loadingRecycling"
              :components="recyclingResult?.variant?.components"
              :variant-id="vars.id"
              :entity-name="FeedbackEntityName.Variant"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus as PlusIcon, RefreshCw as RefreshCwIcon, Recycle as RecycleIcon } from '@lucide/vue'

import { graphql } from '~/gql'
import { FeedbackEntityName } from '~/gql/types.generated'

const route = useRoute()

useTopbar(null)

const activeTab = ref<'reuse' | 'recycle'>('recycle')
const tabs = [
  { id: 'reuse', label: 'Reuse', icon: RefreshCwIcon },
  { id: 'recycle', label: 'Recycle', icon: RecycleIcon },
]

const variantQuery = graphql(`
  query GetVariant($id: ID!) {
    variant(id: $id) {
      id
      name
      desc
      imageURL
      images {
        nodes {
          url
        }
      }
      orgs {
        nodes {
          org {
            id
            name
            desc
            avatarURL
          }
        }
      }
      components {
        nodes {
          component {
            id
            name
            desc
            imageURL
          }
        }
      }
    }
  }
`)
const variantRecycling = graphql(`
  query GetVariantRecycling($id: ID!) {
    variant(id: $id) {
      id
      name
      recycleScore {
        score
        rating
        ratingF
      }
      components {
        ...VariantRecycleStreams
      }
    }
  }
`)

const vars = {
  id: typeof route.params.id === 'string' ? route.params.id : route.params.id?.[0] || '',
}

const { result: data } = useQuery(variantQuery, vars)

const allImages = computed<string[]>(() => {
  const nodes = data.value?.variant?.images?.nodes
  if (nodes && nodes.length > 0) {
    return nodes.map((n) => n.url).filter((url): url is string => !!url)
  }
  return data.value?.variant?.imageURL ? [data.value.variant.imageURL] : []
})

const orgSubtitle = computed(
  () => data.value?.variant?.orgs.nodes?.map((o) => o.org.name).join(', ') ?? undefined,
)

const recentStore = useRecentStore()
onMounted(() => {
  recentStore.add({ id: vars.id, __typename: 'Variant' })
})

const regionStore = useRegionStore()
regionStore.load()
const {
  result: recyclingResult,
  load: loadRecycling,
  loading: loadingRecycling,
} = useLazyQuery(variantRecycling, {
  id: typeof route.params.id === 'string' ? route.params.id : route.params.id?.[0] || '',
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
