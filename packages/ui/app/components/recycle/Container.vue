<template>
  <div v-if="recycle.stream && recycle.stream.container" class="m-1">
    <Card class="bg-base-200 shadow-lg">
      <CardHeader class="flex flex-row items-center">
        <ScoreGauge
          class="size-24 p-1"
          :score="recycle.stream?.score?.score"
          :rating="recycle.stream?.score?.rating"
          :rating-f="recycle.stream?.score?.ratingF"
        />
        <div class="mr-2 ml-4 flex-1">
          <CardTitle class="text-md text-left font-normal">{{ recycle.stream.name }}</CardTitle>
          <CardDescription class="text-left text-sm">{{ recycle.stream.desc }}</CardDescription>
        </div>
      </CardHeader>
      <CardContent class="flex flex-col items-center justify-center px-4 pb-3">
        <div
          class="relative max-w-[256px]"
          :style="{
            'margin-top': containerTopMargin,
          }"
        >
          <UiImage
            v-if="recycle.stream.container.image"
            ref="containerImage"
            :src="recycle.stream.container.image"
          />
          <div
            v-if="recycle.stream.container.image"
            ref="compImage"
            class="absolute rounded-xl bg-base-100 shadow-md shadow-base-content"
            :style="{
              top: `${compPercs.y}%`,
              left: `${compPercs.x}%`,
              'border-color': recycle.stream.container.color || '#000',
            }"
          >
            <UiImage :src="image || ''" :width="20" :height="20" />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { useElementSize } from '@vueuse/core'

import type { RecyclingStream } from '~/gql/types.generated'

type RecycleDisplay = {
  stream?: (Omit<RecyclingStream, 'programs'> & { programs?: RecyclingStream['programs'] }) | null
  context:
    | ReadonlyArray<{ key: string; markdown?: string | null }>
    | Array<{ key: string; markdown?: string | null }>
}

const { image, recycle } = defineProps<{
  image?: string | null
  recycle: RecycleDisplay
}>()

const containerImage = useTemplateRef<HTMLImageElement>('containerImage')
const compImage = useTemplateRef<HTMLImageElement>('compImage')
const containerDims = useElementSize(containerImage)
const compDims = useElementSize(compImage)

const compPercs = computed(() => {
  if (!compDims.width.value || !compDims.height.value) return { x: 0, y: 0 }
  if (!containerDims.width.value || !containerDims.height.value) return { x: 0, y: 0 }
  if (!recycle?.stream?.container?.imageEntryPoint) return { x: 0, y: 0 }
  return {
    x:
      recycle.stream.container.imageEntryPoint.x -
      (compDims.width.value / containerDims.width.value) * 50,
    y:
      recycle.stream.container.imageEntryPoint.y -
      (compDims.height.value / containerDims.height.value) * 50,
  }
})
const containerTopMargin = computed(() => {
  if (compPercs.value.y < 0) {
    return (-compPercs.value.y / 100) * containerDims.height.value + 'px'
  }
  return '0px'
})
</script>
