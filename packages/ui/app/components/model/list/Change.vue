<template>
  <li
    class="list-row relative transition-colors"
    :class="{ 'cursor-pointer hover:bg-base-300': !!href || !!onRowClick }"
  >
    <NuxtLink v-if="href" :to="href" class="absolute inset-0" />
    <button v-else-if="onRowClick" class="absolute inset-0" @click="onRowClick" />
    <div>
      <span
        class="badge badge-sm"
        :class="{
          'badge-primary': change.status === ChangeStatus.Merged,
          'badge-info': change.status === ChangeStatus.Proposed,
          'badge-success': change.status === ChangeStatus.Approved,
          'badge-warning': change.status === ChangeStatus.Draft,
          'badge-error': change.status === ChangeStatus.Rejected,
        }"
      >
        {{ change.status }}
      </span>
    </div>
    <div>
      <div class="text-bold">{{ change.title }}</div>
      <div class="text-xs opacity-70">
        {{ change.description }}
      </div>
      <div class="mt-1 flex items-center gap-1 text-xs opacity-50">
        <span v-if="change.user">by @{{ change.user.username }}</span>
        <span v-if="change.user && change.createdAt"> · </span>
        <TooltipProvider v-if="change.createdAt">
          <Tooltip>
            <TooltipTrigger as-child>
              <span class="cursor-default">
                {{ sameDate ? 'Created/Updated' : 'Created' }} {{ createdAgo }}
              </span>
            </TooltipTrigger>
            <TooltipContent>{{ createdFull }}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <template v-if="!sameDate && change.updatedAt">
          <span> · </span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <span class="cursor-default">Updated {{ updatedAgo }}</span>
              </TooltipTrigger>
              <TooltipContent>{{ updatedFull }}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </template>
      </div>
    </div>
    <ModelListActionButtons
      v-if="buttons && buttons.length"
      :id="change.id"
      class="pointer-events-none relative z-10"
      :buttons="buttons"
      @button="(btn: string) => emits('button', btn, change.id)"
    />
  </li>
</template>

<script setup lang="ts">
import { useTimeAgo } from '@vueuse/core'

import { graphql, useFragment, type FragmentType } from '~/gql'
import { ChangeStatus } from '~/gql/graphql'

const ListChangeFragment = graphql(`
  fragment ListChangeFragment on Change {
    id
    title
    description
    status
    createdAt
    updatedAt
    user {
      id
      name
      username
    }
  }
`)

const props = defineProps<{
  change: FragmentType<typeof ListChangeFragment>
  buttons?: ('select' | 'edit' | 'delete')[]
  href?: string
  onRowClick?: () => void
}>()

const emits = defineEmits<{
  (e: 'button', btn: string, id: string): void
}>()

const change = computed(() => useFragment(ListChangeFragment, props.change))

const createdDate = computed(() => new Date(change.value.createdAt ?? 0))
const updatedDate = computed(() => new Date(change.value.updatedAt ?? change.value.createdAt ?? 0))
const createdAgo = useTimeAgo(createdDate)
const updatedAgo = useTimeAgo(updatedDate)
const createdFull = computed(() => createdDate.value.toLocaleString())
const updatedFull = computed(() => updatedDate.value.toLocaleString())
const sameDate = computed(
  () => change.value.updatedAt === change.value.createdAt || !change.value.updatedAt,
)
</script>
