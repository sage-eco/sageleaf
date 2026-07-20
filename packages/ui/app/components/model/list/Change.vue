<template>
  <li
    class="list-row relative"
    :class="{ 'cursor-pointer hover:bg-base-200': !!href || !!onRowClick }"
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
      <div class="mt-1 text-xs opacity-50">
        <span v-if="change.user">by @{{ change.user.username }}</span>
        <span v-if="change.user && change.createdAt"> · </span>
        <span v-if="change.createdAt">{{ formattedDate }}</span>
      </div>
    </div>
    <ModelListActionButtons
      v-if="buttons && buttons.length"
      :id="change.id"
      class="relative z-10"
      :buttons="buttons"
      @button="(btn: string) => emits('button', btn, change.id)"
    />
  </li>
</template>

<script setup lang="ts">
import { graphql, useFragment, type FragmentType } from '~/gql'
import { ChangeStatus } from '~/gql/graphql'

const ListChangeFragment = graphql(`
  fragment ListChangeFragment on Change {
    id
    title
    description
    status
    createdAt
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
const formattedDate = computed(() =>
  change.value.createdAt
    ? new Date(change.value.createdAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null,
)
</script>
