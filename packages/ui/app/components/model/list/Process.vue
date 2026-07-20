<template>
  <li
    class="list-row relative flex items-center gap-4 rounded-lg px-4 py-3 transition-colors"
    :class="{ 'cursor-pointer hover:bg-base-200': !!href || !!onRowClick }"
  >
    <NuxtLink v-if="href" :to="href" class="absolute inset-0" />
    <button v-else-if="onRowClick" class="absolute inset-0" @click="onRowClick" />
    <div v-if="$slots.leading" class="relative z-10">
      <slot name="leading" />
    </div>
    <div class="min-w-0 flex-1">
      <div class="text-bold">{{ process.name }}</div>
      <div class="text-xs opacity-70">
        {{ process.desc }}
      </div>
      <div v-if="hasBadges" class="mt-1 flex flex-wrap gap-1">
        <span v-if="process.intent" class="badge badge-sm badge-primary">{{ process.intent }}</span>
        <span v-if="process.material?.name" class="badge badge-outline badge-sm">{{
          process.material.name
        }}</span>
        <span v-if="process.org?.name" class="badge badge-outline badge-sm">{{
          process.org.name
        }}</span>
        <span v-if="process.region?.name" class="badge badge-outline badge-sm">{{
          process.region.name
        }}</span>
      </div>
    </div>
    <ModelListActionButtons
      v-if="buttons && buttons.length"
      :id="process.id"
      class="relative z-10"
      :buttons="buttons"
      @button="(btn: string) => emits('button', btn, process.id)"
    />
  </li>
</template>

<script setup lang="ts">
import { graphql, useFragment, type FragmentType } from '~/gql'

const ListProcessFragment = graphql(`
  fragment ListProcessFragment on Process {
    id
    name
    desc
    intent
    material {
      id
      name
    }
    org {
      id
      name
    }
    region {
      id
      name
    }
  }
`)

const props = defineProps<{
  process: FragmentType<typeof ListProcessFragment>
  buttons?: ('select' | 'edit' | 'delete')[]
  href?: string
  onRowClick?: () => void
}>()

const emits = defineEmits<{
  (e: 'button', btn: string, id: string): void
}>()

const process = computed(() => useFragment(ListProcessFragment, props.process))
const hasBadges = computed(
  () =>
    !!process.value.intent ||
    !!process.value.material?.name ||
    !!process.value.org?.name ||
    !!process.value.region?.name,
)
</script>
