<script setup lang="ts">
import { CircleHelp as CircleHelpIcon, Frown } from '@lucide/vue'

import { graphql } from '~/gql'
import { useFragment, type FragmentType } from '~/gql/fragment-masking'
import { FeedbackEntityName } from '~/gql/types.generated'

const VariantRecycleStreamsFragment = graphql(`
  fragment VariantRecycleStreams on VariantComponentsConnection {
    nodes {
      component {
        id
        name
        desc
        imageURL
        primaryMaterial {
          id
          name
        }
        recycleScore {
          score
          rating
          ratingF
        }
        recycle {
          context {
            key
            markdown
          }
          stream {
            name
            desc
            score {
              score
              rating
              ratingF
            }
            container {
              type
              access
              shape {
                width
                height
                depth
              }
              color
              image
              imageEntryPoint {
                x
                y
                side
              }
            }
          }
        }
      }
    }
  }
`)

const props = defineProps<{
  components?: FragmentType<typeof VariantRecycleStreamsFragment> | null
  loading?: boolean
  variantId?: string
  entityName?: FeedbackEntityName
}>()

const componentsData = computed(() =>
  props.components ? useFragment(VariantRecycleStreamsFragment, props.components) : null,
)
</script>

<template>
  <div v-if="loading" class="space-y-3 px-4">
    <div class="h-4 w-28 skeleton"></div>
    <div class="h-4 w-full skeleton"></div>
    <div class="h-4 w-full skeleton"></div>
  </div>
  <div v-else-if="componentsData?.nodes?.length" class="space-y-3 px-3">
    <div
      v-for="vc in componentsData.nodes"
      :key="vc.component.id"
      class="rounded-box bg-base-200 p-3 shadow-sm"
    >
      <div class="mb-3 flex flex-col gap-3">
        <!-- Top Section: Image and Info -->
        <div class="flex items-center gap-4">
          <UiImage class="size-14 shrink-0 rounded-box" :src="vc.component.imageURL || undefined" />
          <div class="flex flex-col gap-0.5">
            <div class="text-base leading-tight font-semibold">{{ vc.component.name }}</div>
            <div
              v-if="vc.component.primaryMaterial?.name"
              class="text-[10px] font-medium tracking-wider uppercase opacity-50"
            >
              {{ vc.component.primaryMaterial.name }}
            </div>
          </div>
        </div>

        <!-- Description Section -->
        <div v-if="vc.component.desc" class="mx-3 text-sm opacity-60">
          {{ vc.component.desc }}
        </div>
      </div>
      <template v-if="vc.component.recycle?.length">
        <RecycleContainer
          v-for="recycle in vc.component.recycle"
          :key="recycle.stream?.name || undefined"
          :image="vc.component.imageURL"
          :recycle="recycle"
        />
      </template>
      <div v-else class="mt-2 flex items-center gap-3 rounded-box bg-base-100 p-3">
        <CircleHelpIcon :size="24" class="shrink-0 opacity-40" />
        <div>
          <div class="text-sm font-medium">Instructions Unknown</div>
          <div class="text-xs opacity-60">No recycling data available for this component.</div>
        </div>
      </div>
      <div class="mt-3 flex justify-end border-t border-base-300/50 pt-2">
        <FeedbackVoteButtons
          :entity-name="FeedbackEntityName.Component"
          :entity-id="vc.component.id"
          :related-ids="{ componentId: vc.component.id, ...(variantId ? { variantId } : {}) }"
        />
      </div>
    </div>
  </div>
  <FeedbackEmptyDataFeedback
    v-else-if="variantId"
    :entity-name="entityName ?? FeedbackEntityName.Variant"
    :entity-id="variantId"
    :related-ids="{ variantId }"
  />
  <div v-else class="text-md flex flex-col items-center gap-2 px-4 py-4 text-center opacity-60">
    <Frown :size="48" />
    <p>Recycling instructions are currently not available.</p>
  </div>
</template>
