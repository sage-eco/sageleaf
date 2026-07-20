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
      <div class="flex items-center gap-2">
        <span class="font-semibold">{{ program.name }}</span>
        <span v-if="program.status" class="badge badge-sm" :class="statusBadgeClass">
          {{ program.status }}
        </span>
      </div>
      <div class="text-xs opacity-70">
        {{ program.desc }}
      </div>
      <div v-if="program.region?.name || firstOrg" class="mt-1 flex flex-wrap gap-1">
        <span v-if="program.region?.name" class="badge badge-outline badge-sm">{{
          program.region.name
        }}</span>
        <span v-if="firstOrg" class="badge badge-outline badge-sm">{{ firstOrg }}</span>
      </div>
    </div>
    <ModelListActionButtons
      v-if="buttons && buttons.length"
      :id="program.id"
      class="relative z-10"
      :buttons="buttons"
      @button="(btn: string) => emits('button', btn, program.id)"
    />
  </li>
</template>

<script setup lang="ts">
import { graphql, useFragment, type FragmentType } from '~/gql'

const ListProgramFragment = graphql(`
  fragment ListProgramFragment on Program {
    id
    name
    desc
    status
    region {
      id
      name
    }
    orgs(first: 1) {
      nodes {
        id
        name
      }
    }
  }
`)

const props = defineProps<{
  program: FragmentType<typeof ListProgramFragment>
  buttons?: ('select' | 'edit' | 'delete')[]
  href?: string
  onRowClick?: () => void
}>()

const emits = defineEmits<{
  (e: 'button', btn: string, id: string): void
}>()

const program = computed(() => useFragment(ListProgramFragment, props.program))
const firstOrg = computed(() => program.value.orgs?.nodes?.[0]?.name ?? null)

const statusBadgeClass = computed(() => {
  switch (program.value.status) {
    case 'ACTIVE':
      return 'badge-success'
    case 'PLANNED':
      return 'badge-warning'
    case 'CLOSED':
      return 'badge-ghost'
    default:
      return 'badge-outline'
  }
})
</script>
