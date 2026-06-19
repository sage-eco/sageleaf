<script setup lang="ts">
import { MessageSquareWarning as MessageSquareWarningIcon } from '@lucide/vue'
import { T, useTranslate } from '@tolgee/vue'
import { computed, ref } from 'vue'

import { graphql } from '~/gql'
import { FeedbackAction, type FeedbackEntityName } from '~/gql/types.generated'

const { t } = useTranslate()

const props = defineProps<{
  entityName: FeedbackEntityName
  entityId: string
  relatedIds?: Record<string, string>
  title?: string
  subtitle?: string
  ctaLabel?: string
  drawerTitle?: string
  drawerDescription?: string
  drawerPlaceholder?: string
}>()

const title = computed(
  () => props.title ?? t.value('feedback.missing.card.title', { ns: 'frontend' }),
)
const subtitle = computed(
  () => props.subtitle ?? t.value('feedback.missing.card.subtitle', { ns: 'frontend' }),
)
const ctaLabel = computed(
  () => props.ctaLabel ?? t.value('feedback.missing.card.cta', { ns: 'frontend' }),
)
const drawerTitleText = computed(
  () => props.drawerTitle ?? t.value('feedback.missing.drawer.title', { ns: 'frontend' }),
)
const drawerDescriptionText = computed(
  () =>
    props.drawerDescription ?? t.value('feedback.missing.drawer.description', { ns: 'frontend' }),
)
const drawerPlaceholderText = computed(
  () =>
    props.drawerPlaceholder ?? t.value('feedback.missing.drawer.placeholder', { ns: 'frontend' }),
)

const route = useRoute()

const voteMutation = graphql(`
  mutation FeedbackVoteMissingData($input: VoteInput!) {
    vote(input: $input) {
      success
    }
  }
`)

const { mutate } = useMutation(voteMutation)

const drawerOpen = ref(false)
const details = ref('')
const submitting = ref(false)
const submitError = ref<string | null>(null)
const submitted = ref(false)

const openDrawer = () => {
  if (!props.entityId) return
  details.value = ''
  submitError.value = null
  drawerOpen.value = true
}

const submit = async () => {
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
            url: route.fullPath,
            relatedIds: props.relatedIds ?? null,
          },
        },
      },
    })
    submitted.value = true
    drawerOpen.value = false
  } catch (e) {
    submitError.value =
      e instanceof Error ? e.message : t.value('feedback.vote.error', { ns: 'frontend' })
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="flex flex-col items-center gap-3 px-6 py-8 text-center">
    <Icon
      name="sageleaf-app:undraw-void-wez2"
      class="text-base-content/40"
      style="width: 10rem; height: 10rem"
    />
    <div class="space-y-1">
      <p class="text-base font-semibold">{{ title }}</p>
      <p class="text-sm text-base-content/60">{{ subtitle }}</p>
    </div>
    <Button
      v-if="!submitted"
      variant="outline"
      class="mt-2"
      :disabled="!entityId"
      @click="openDrawer"
    >
      <MessageSquareWarningIcon :size="14" />
      {{ ctaLabel }}
    </Button>
    <p v-else class="text-sm font-medium text-success">
      <T ns="frontend" key-name="feedback.vote.success" />
    </p>
  </div>

  <Drawer v-model:open="drawerOpen">
    <DrawerContent
      class="flex max-h-[calc(100dvh-0.5rem)] min-h-[min(70dvh,calc(100dvh-0.5rem))] flex-col"
    >
      <DrawerHeader class="text-left">
        <DrawerTitle>{{ drawerTitleText }}</DrawerTitle>
        <DrawerDescription>{{ drawerDescriptionText }}</DrawerDescription>
      </DrawerHeader>
      <div class="flex-1 space-y-3 overflow-y-auto px-4 pt-2 pb-2">
        <FormTextArea
          v-model="details"
          class="min-h-24 w-full text-sm"
          rows="4"
          :placeholder="drawerPlaceholderText"
        />
        <p v-if="submitError" class="text-xs text-error">{{ submitError }}</p>
      </div>
      <DrawerFooter class="pb-6">
        <DrawerClose as-child>
          <Button variant="outline" class="w-full" :disabled="submitting">
            <T ns="common" key-name="cta.cancel" />
          </Button>
        </DrawerClose>
        <Button class="w-full" :disabled="!details.trim() || submitting" @click="submit">
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
