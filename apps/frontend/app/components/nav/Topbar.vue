<template>
  <div class="sticky top-0 z-1 bg-base-200 pt-[env(safe-area-inset-top)] shadow-sm">
    <div class="flex items-center justify-between p-2">
      <button v-if="back" class="btn ml-1 btn-ghost" @click.prevent="goBack">
        <ArrowLeft :size="20" />
      </button>
      <div v-if="useImage" class="mx-2 flex items-center">
        <img v-if="image" :src="image" class="h-10 w-10 rounded-full bg-base-100" />
        <Image v-if="!image" class="h-6! w-6 pt-1 text-neutral-700 dark:text-neutral-300" />
      </div>
      <div class="flex flex-1 flex-col" :class="{ 'items-center': !back }">
        <template v-if="loading">
          <div class="m-3 h-5 w-32 skeleton rounded" />
          <div v-if="subtitle !== undefined" class="mx-3 mb-1 h-3 w-48 skeleton rounded" />
        </template>
        <template v-else>
          <h2
            class="m-3 line-clamp-1 h-5 text-xl leading-5 font-light text-base-content"
            :class="{ 'my-1': !!subtitle }"
          >
            {{ title }}
          </h2>
          <h4
            v-if="subtitle"
            class="mx-3 line-clamp-1 h-3 text-xs leading-3 text-base-content"
            :class="{ 'mb-1': !!subtitle }"
          >
            {{ subtitle }}
          </h4>
        </template>
      </div>
      <button v-if="context" class="btn mx-3 btn-ghost">
        <EllipsisVertical :size="20" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowLeft, EllipsisVertical, Image } from '@lucide/vue'

const router = useRouter()

const { title, subtitle, back, context, useImage, image, loading } = defineProps<{
  title?: string
  subtitle?: string
  back?: string
  context?: boolean
  useImage?: boolean
  image?: string
  loading?: boolean
}>()

function goBack() {
  // TODO: This is a terrible hack and only works for this case
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(router.options as unknown as any).is_back = true

  if (back?.startsWith('/')) {
    navigateTo(back)
  } else {
    router.back()
  }
}
</script>
