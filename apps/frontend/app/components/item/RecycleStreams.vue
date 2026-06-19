<script setup lang="ts">
import { graphql } from '~/gql'
import { useFragment, type FragmentType } from '~/gql/fragment-masking'
import { FeedbackEntityName } from '~/gql/types.generated'

const ItemRecycleStreamsFragment = graphql(`
  fragment ItemRecycleStreams on ItemRecycle {
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
    context {
      key
      markdown
    }
  }
`)

const props = defineProps<{
  recycle?: FragmentType<typeof ItemRecycleStreamsFragment>[] | null
  loading?: boolean
  entityId?: string
  relatedIds?: Record<string, string>
}>()

const recycleEntries = computed(() =>
  props.recycle ? props.recycle.map((r) => useFragment(ItemRecycleStreamsFragment, r)) : [],
)
</script>

<template>
  <div v-if="loading" class="space-y-3 px-4">
    <div class="h-4 w-28 skeleton"></div>
    <div class="h-4 w-full skeleton"></div>
    <div class="h-4 w-full skeleton"></div>
  </div>
  <div v-else-if="recycleEntries.length" class="space-y-3 px-3">
    <template v-for="(entry, i) in recycleEntries" :key="entry.stream?.name ?? i">
      <RecycleContainer :recycle="entry" />
    </template>
  </div>
  <FeedbackEmptyDataFeedback
    v-else-if="entityId"
    :entity-name="FeedbackEntityName.Item"
    :entity-id="entityId"
    :related-ids="relatedIds"
  />
  <div v-else class="text-md flex flex-col items-center gap-2 px-4 py-4 text-center opacity-60">
    <p>Recycling instructions are currently not available.</p>
  </div>
</template>
