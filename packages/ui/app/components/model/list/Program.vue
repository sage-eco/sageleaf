<template>
  <li
    class="list-row relative"
    :class="{ 'cursor-pointer hover:bg-base-200': !!href || !!onRowClick }"
  >
    <NuxtLink v-if="href" :to="href" class="absolute inset-0" />
    <button v-else-if="onRowClick" class="absolute inset-0" @click="onRowClick" />
    <div></div>
    <div>
      <div class="flex items-center gap-2">
        <span class="font-semibold">{{ program.name }}</span>
        <span v-if="program.status" class="badge badge-sm" :class="statusBadgeClass">
          {{ program.status }}
        </span>
      </div>
      <div class="text-xs opacity-70">
        {{ program.desc }}
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
