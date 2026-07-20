<template>
  <div
    class="relative aspect-[3/4] cursor-pointer overflow-hidden rounded-lg border border-base-300 bg-base-200 transition-opacity hover:opacity-90"
    @click="showModal = true"
  >
    <UiImage v-if="isImage" :src="source.contentURL" fit="cover" class="h-full w-full" />
    <div v-else class="flex h-full flex-col items-center justify-center gap-2 p-3">
      <ExternalLink class="size-8 opacity-40" />
      <span class="badge badge-outline badge-sm">{{ source.type }}</span>
    </div>
    <span
      v-if="!isImage"
      class="absolute right-1 bottom-1 badge badge-outline bg-base-100 badge-sm"
    >
      {{ source.type }}
    </span>
  </div>

  <Dialog v-model:open="showModal">
    <DialogContent class="h-[90vh] w-[90vw] max-w-[90vw] overflow-auto sm:max-w-[90vw]">
      <DialogTitle class="sr-only">Source</DialogTitle>

      <div :class="isImage ? 'grid grid-cols-2 gap-4' : 'flex flex-col gap-4'">
        <UiImage
          v-if="isImage"
          :src="source.contentURL"
          fit="contain"
          class="h-full w-full rounded"
        />

        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-2 text-sm">
            <div v-if="source.contentURL">
              <span class="font-semibold">URL:</span>
              <a :href="source.contentURL" target="_blank" class="ml-2 link link-primary">{{
                source.contentURL
              }}</a>
            </div>
            <div v-if="source.location">
              <span class="font-semibold">Location:</span> {{ source.location }}
            </div>
          </div>

          <div class="flex gap-2">
            <Button
              v-if="source.location"
              variant="outline"
              size="sm"
              as="a"
              :href="source.location"
              target="_blank"
            >
              <ExternalLink class="size-4" /> Open Location
            </Button>
            <Button
              v-if="source.contentURL"
              variant="outline"
              size="sm"
              as="a"
              :href="source.contentURL"
              target="_blank"
            >
              <ExternalLink class="size-4" /> Open URL
            </Button>
          </div>

          <div>
            <button
              class="flex w-full items-center gap-2 text-sm font-semibold"
              @click="showChanges = !showChanges"
            >
              <ChevronRight
                class="size-4 transition-transform"
                :class="{ 'rotate-90': showChanges }"
              />
              Changes
            </button>
            <div v-if="showChanges" class="mt-2">
              <div v-if="changesLoading" class="flex justify-center p-4">
                <span class="loading loading-spinner" />
              </div>
              <ul v-else class="list">
                <div v-for="change in sourceData?.changes?.nodes ?? []" :key="change.id">
                  <ModelListChange
                    :change="change"
                    :on-row-click="() => panelStore.openPanel('change', change.id)"
                  />
                </div>
              </ul>
              <div
                v-if="!changesLoading && !sourceData?.changes?.nodes?.length"
                class="text-sm opacity-60"
              >
                None
              </div>
            </div>
          </div>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { ChevronRight, ExternalLink } from '@lucide/vue'

import { graphql, useFragment, type FragmentType } from '~/gql'
import { SourceType } from '~/gql/graphql'
import { useDetailPanelStore } from '~/stores/detail_panel_store'

const SourceCardFragment = graphql(`
  fragment SourceCardFragment on Source {
    id
    type
    contentURL
    location
  }
`)

const props = defineProps<{
  source: FragmentType<typeof SourceCardFragment>
}>()

const source = useFragment(SourceCardFragment, props.source)

const showModal = ref(false)
const showChanges = ref(false)
const panelStore = useDetailPanelStore()

const isImage = computed(() => source.type === SourceType.Image)

const sourceCardQuery = graphql(`
  query SourceCardDetails($id: ID!) {
    source(id: $id) {
      id
      changes {
        nodes {
          id
          ...ListChangeFragment
        }
      }
    }
  }
`)

const { result: sourceResult, loading: changesLoading } = useQuery(
  sourceCardQuery,
  () => ({ id: source.id }),
  { enabled: computed(() => showModal.value) },
)
const sourceData = computed(() => sourceResult.value?.source ?? null)
</script>
