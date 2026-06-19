<script setup lang="ts">
import { ThumbsDown as ThumbsDownIcon, ThumbsUp as ThumbsUpIcon } from '@lucide/vue'
import { T, useTranslate } from '@tolgee/vue'
import { computed, ref } from 'vue'

import { graphql } from '~/gql'
import { FeedbackAction, type FeedbackEntityName } from '~/gql/types.generated'

const { t } = useTranslate()

const props = defineProps<{
  entityName: FeedbackEntityName
  entityId: string
  relatedIds?: Record<string, string>
}>()

const route = useRoute()
const context = computed(() => ({
  url: route.fullPath,
  relatedIds: props.relatedIds,
}))

const voteMutation = graphql(`
  mutation FeedbackVote($input: VoteInput!) {
    vote(input: $input) {
      success
    }
  }
`)

const { mutate } = useMutation(voteMutation)

const current = ref<FeedbackAction.Upvote | FeedbackAction.Downvote | null>(null)
const downvoteOpen = ref(false)
const details = ref('')
const submitting = ref(false)
const submitError = ref<string | null>(null)

const upvote = async () => {
  if (!props.entityId) return
  if (current.value === FeedbackAction.Upvote) return
  const previous = current.value
  current.value = FeedbackAction.Upvote
  try {
    await mutate({
      input: {
        entityName: props.entityName,
        entityID: props.entityId,
        action: FeedbackAction.Upvote,
      },
    })
  } catch {
    current.value = previous
  }
}

const openDownvote = () => {
  if (!props.entityId) return
  details.value = ''
  submitError.value = null
  downvoteOpen.value = true
}

const submitDownvote = async () => {
  if (!props.entityId) return
  const trimmed = details.value.trim()
  if (!trimmed) return
  submitting.value = true
  submitError.value = null
  try {
    await mutate({
      input: {
        entityName: props.entityName,
        entityID: props.entityId,
        action: FeedbackAction.Downvote,
        data: {
          details: trimmed,
          context: {
            url: context.value.url,
            relatedIds: context.value.relatedIds ?? null,
          },
        },
      },
    })
    current.value = FeedbackAction.Downvote
    downvoteOpen.value = false
  } catch (e) {
    submitError.value =
      e instanceof Error ? e.message : t.value('feedback.vote.error', { ns: 'frontend' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex items-center gap-0.5">
    <button
      type="button"
      class="btn btn-square btn-ghost btn-sm"
      :class="current === FeedbackAction.Upvote && 'text-success'"
      :aria-label="t('feedback.upvote', { ns: 'frontend' })"
      :disabled="!entityId"
      @click="upvote"
    >
      <ThumbsUpIcon
        :size="16"
        :fill="current === FeedbackAction.Upvote ? 'currentColor' : 'none'"
        :stroke-width="current === FeedbackAction.Upvote ? 2 : 1.75"
      />
    </button>
    <button
      type="button"
      class="btn btn-square btn-ghost btn-sm"
      :class="current === FeedbackAction.Downvote && 'text-error'"
      :aria-label="t('feedback.downvote', { ns: 'frontend' })"
      :disabled="!entityId"
      @click="openDownvote"
    >
      <ThumbsDownIcon
        :size="16"
        :fill="current === FeedbackAction.Downvote ? 'currentColor' : 'none'"
        :stroke-width="current === FeedbackAction.Downvote ? 2 : 1.75"
      />
    </button>
  </div>

  <Drawer v-model:open="downvoteOpen">
    <DrawerContent
      class="flex max-h-[calc(100dvh-0.5rem)] min-h-[min(70dvh,calc(100dvh-0.5rem))] flex-col"
    >
      <DrawerHeader class="text-left">
        <DrawerTitle>{{ t('feedback.vote.drawer.title', { ns: 'frontend' }) }}</DrawerTitle>
        <DrawerDescription>
          {{ t('feedback.vote.drawer.description', { ns: 'frontend' }) }}
        </DrawerDescription>
      </DrawerHeader>
      <div class="flex-1 space-y-3 overflow-y-auto px-4 pt-2 pb-2">
        <FormTextArea
          v-model="details"
          class="min-h-24 w-full text-sm"
          rows="4"
          :placeholder="t('feedback.vote.drawer.placeholder', { ns: 'frontend' })"
        />
        <p v-if="submitError" class="text-xs text-error">{{ submitError }}</p>
      </div>
      <DrawerFooter class="pb-6">
        <DrawerClose as-child>
          <Button variant="outline" class="w-full" :disabled="submitting">
            <T ns="common" key-name="cta.cancel" />
          </Button>
        </DrawerClose>
        <Button class="w-full" :disabled="!details.trim() || submitting" @click="submitDownvote">
          {{
            submitting
              ? t('feedback.vote.submitting', { ns: 'frontend' })
              : t('feedback.vote.submit', { ns: 'frontend' })
          }}
        </Button>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
</template>
