<script setup lang="ts">
import { FeedbackEntityName } from '~/gql/types.generated'

defineProps<{
  entityName?: FeedbackEntityName
  entityId?: string
  relatedIds?: Record<string, string>
}>()
</script>

<template>
  <FeedbackEmptyDataFeedback
    v-if="entityId"
    :entity-name="entityName ?? FeedbackEntityName.Item"
    :entity-id="entityId"
    :related-ids="relatedIds"
  />
  <p v-else class="px-4 py-4 text-center text-sm opacity-60">No suggestions available.</p>
</template>
