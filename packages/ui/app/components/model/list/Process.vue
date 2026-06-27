<template>
  <li
    class="list-row relative"
    :class="{ 'cursor-pointer hover:bg-base-200': !!href || !!onRowClick }"
  >
    <NuxtLink v-if="href" :to="href" class="absolute inset-0" />
    <button v-else-if="onRowClick" class="absolute inset-0" @click="onRowClick" />
    <div></div>
    <div>
      <div class="text-bold">{{ process.name }}</div>
      <div class="text-xs opacity-70">
        {{ process.desc }}
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
</script>
