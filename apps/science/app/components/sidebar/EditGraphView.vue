<template>
  <div class="flex h-full flex-col gap-2">
    <div
      class="min-h-0 w-full flex-1 overflow-hidden rounded-md border border-base-300 bg-base-100"
    >
      <VueFlow
        :nodes="nodes"
        :edges="edges"
        :nodes-draggable="false"
        :nodes-connectable="false"
        fit-view-on-init
        class="rounded-md"
      >
        <template #node-center="{ data }">
          <div
            class="rounded-md border-2 border-primary bg-primary/10 px-3 py-1.5 text-xs font-semibold"
          >
            {{ data.label }}
          </div>
        </template>
        <template #node-group="{ data }">
          <div
            class="relative h-full w-full overflow-visible rounded-md border border-dashed border-base-content/30"
          >
            <div
              class="absolute -top-2.5 left-2 bg-base-100 px-1 text-[0.65rem] font-medium tracking-wide uppercase opacity-60"
            >
              {{ data.label }}
            </div>
          </div>
        </template>
        <template #node-ref="{ data }">
          <div class="max-w-40 rounded-md border px-2 py-1 text-xs" :class="diffClass(data.kind)">
            <div class="flex items-center gap-1">
              <span class="badge badge-xs" :class="diffBadgeClass(data.kind)">
                {{ diffSymbol(data.kind) }}
              </span>
              <span v-if="data.typename" class="badge badge-outline badge-xs">{{
                data.typename
              }}</span>
            </div>
            <div class="mt-1 truncate font-medium" :title="data.label">{{ data.label }}</div>
          </div>
        </template>
      </VueFlow>
    </div>
    <div v-if="loading" class="flex justify-center py-2">
      <span class="loading loading-sm loading-spinner" />
    </div>
    <div v-if="hasMore" class="flex justify-center">
      <Button size="xs" variant="outline" :disabled="loading" @click="loadMore">
        Load more ({{ refs.length }} / {{ refNodes.length }} shown)
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Position, VueFlow } from '@vue-flow/core'

import type { DiffKind } from '~/composables/useEditDiff'
import { OpType } from '~/gql/graphql'

const props = defineProps<{
  entityName?: string | null
  refNodes: { id: string; op: OpType; field: string }[]
}>()

const { diffClass, diffBadgeClass, diffSymbol } = useEditDiff(
  ref<{ originalJSON?: unknown; changesJSON?: unknown } | null>(null),
)

const opToKind: Record<OpType, DiffKind> = {
  [OpType.Added]: 'added',
  [OpType.Modified]: 'modified',
  [OpType.Removed]: 'removed',
}

const humanizeField = (field: string): string =>
  field
    .replaceAll(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase())
    .trim()

const { refs, hasMore, loadMore, loading } = useRefGraph(computed(() => props.refNodes))

const groupedRefs = computed(() => {
  const byField = new Map<string, typeof refs.value>()
  for (const r of refs.value) {
    if (!byField.has(r.field)) byField.set(r.field, [])
    byField.get(r.field)!.push(r)
  }
  return [...byField.entries()].map(([field, items]) => ({ field, items }))
})

const centerX = 20
const groupX = 220
const groupWidth = 180
const refHeight = 42
const rowGap = 8
const groupHeaderHeight = 22
const groupPaddingX = 8
const groupPaddingBottom = 8
const groupGap = 20

const layout = computed(() => {
  const groupBoxes: { id: string; field: string; y: number; height: number }[] = []
  let y = 0
  for (const group of groupedRefs.value) {
    const height =
      groupHeaderHeight +
      group.items.length * refHeight +
      Math.max(group.items.length - 1, 0) * rowGap +
      groupPaddingBottom
    groupBoxes.push({ id: `group-${group.field}`, field: group.field, y, height })
    y += height + groupGap
  }
  return { groupBoxes, totalHeight: Math.max(y - groupGap, 0) }
})

const nodes = computed(() => {
  const { groupBoxes, totalHeight } = layout.value
  const centerNode = {
    id: '__center__',
    type: 'center',
    position: { x: centerX, y: Math.max(totalHeight / 2 - 16, 0) },
    data: { label: props.entityName || 'Entity' },
    sourcePosition: Position.Right,
    targetPosition: Position.Left,
  }

  const groupNodes = groupBoxes.map((box) => ({
    id: box.id,
    type: 'group',
    position: { x: groupX, y: box.y },
    data: { label: humanizeField(box.field) },
    style: { width: `${groupWidth}px`, height: `${box.height}px` },
    targetPosition: Position.Left,
  }))

  const refNodesList = groupedRefs.value.flatMap((group) =>
    group.items.map((r, i) => ({
      id: r.id,
      type: 'ref',
      parentNode: `group-${group.field}`,
      extent: 'parent' as const,
      draggable: false,
      position: { x: groupPaddingX, y: groupHeaderHeight + i * (refHeight + rowGap) },
      data: {
        label: r.name || r.id,
        typename: r.typename,
        kind: opToKind[r.op],
      },
    })),
  )

  return [centerNode, ...groupNodes, ...refNodesList]
})

const edges = computed(() =>
  layout.value.groupBoxes.map((box) => ({
    id: `e-${box.id}`,
    source: '__center__',
    target: box.id,
    type: 'step',
    style: { stroke: 'var(--color-base-content)', opacity: 0.35 },
  })),
)
</script>
