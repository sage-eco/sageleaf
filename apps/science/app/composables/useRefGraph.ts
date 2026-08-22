import type { MaybeRefOrGetter } from 'vue'

import { graphql } from '~/gql'
import { OpType } from '~/gql/graphql'

const pageSize = 20

const opSeverity: Record<OpType, number> = {
  [OpType.Removed]: 3,
  [OpType.Added]: 2,
  [OpType.Modified]: 1,
}

export interface GraphRef {
  id: string
  op: OpType
  field: string
  name: string | null
  desc: string | null
  typename: string | null
}

const ResolveRefNodesQuery = graphql(`
  query ResolveRefNodes($ids: [ID!]!) {
    nodes(ids: $ids) {
      id
      __typename
      ... on Named {
        name
        desc
      }
    }
  }
`)

export const useRefGraph = (
  refNodes: MaybeRefOrGetter<{ id: string; op: OpType; field: string }[]>,
) => {
  // Keyed by field + id (not just id) — the same target can legitimately appear under more than
  // one field, and each occurrence should render in its own field group.
  const dedupedRefs = computed(() => {
    const byKey = new Map<string, { id: string; op: OpType; field: string }>()
    for (const ref of toValue(refNodes)) {
      const key = `${ref.field}:${ref.id}`
      const existing = byKey.get(key)
      if (!existing || opSeverity[ref.op] > opSeverity[existing.op]) {
        byKey.set(key, ref)
      }
    }
    return [...byKey.values()]
  })

  const visibleCount = ref(pageSize)
  const resolved = ref(
    new Map<string, { name: string | null; desc: string | null; typename: string | null }>(),
  )
  const loading = ref(false)

  // Pass a plain object (not a function) so this stays a writable ref internally — a variables
  // function is wrapped in a readonly `computed`, which would make load()'s variable override a
  // silent no-op and leave every request stuck on `ids: []`.
  // fetchPolicy 'no-cache' bypasses Apollo's normalized cache read-back: the cache has no
  // `possibleTypes` configured for the `Named` interface, so fields selected via `... on Named`
  // can come back empty when reconstructed from the cache even though the wire response has them.
  // We already do our own id -> name caching below, so we don't need Apollo's cache here anyway.
  const { load, refetch } = useLazyQuery(
    ResolveRefNodesQuery,
    { ids: [] as string[] },
    { fetchPolicy: 'no-cache' },
  )
  let started = false

  // `nodes(ids:)` returns each entity's own bare id (not the global id that was requested), but
  // the response array is positionally aligned with the request `ids` array (null for misses) —
  // so results must be zipped back to the requested global ids by index, not by `node.id`.
  const applyNodes = (
    ids: string[],
    nodes:
      | ({
          __typename?: string
          name?: string | null
          desc?: string | null
        } | null)[]
      | null
      | undefined,
  ) => {
    ids.forEach((id, i) => {
      const node = nodes?.[i]
      if (!node) return
      resolved.value.set(id, {
        name: node.name ?? null,
        desc: node.desc ?? null,
        typename: node.__typename ?? null,
      })
    })
  }

  const resolveIds = async (ids: string[]) => {
    if (ids.length === 0) return
    loading.value = true
    try {
      if (started) {
        const result = await refetch({ ids })
        applyNodes(ids, result?.data?.nodes)
      } else {
        started = true
        const data = await load(ResolveRefNodesQuery, { ids })
        applyNodes(ids, data ? data.nodes : undefined)
      }
    } finally {
      loading.value = false
    }
  }

  watch(
    dedupedRefs,
    (refs) => {
      const ids = refs.slice(0, visibleCount.value).map((r) => r.id)
      const unresolved = ids.filter((id) => !resolved.value.has(id))
      resolveIds(unresolved)
    },
    { immediate: true },
  )

  const refs = computed<GraphRef[]>(() =>
    dedupedRefs.value.slice(0, visibleCount.value).map((r) => {
      const info = resolved.value.get(r.id)
      return {
        id: r.id,
        op: r.op,
        field: r.field,
        name: info?.name ?? null,
        desc: info?.desc ?? null,
        typename: info?.typename ?? null,
      }
    }),
  )

  const hasMore = computed(() => visibleCount.value < dedupedRefs.value.length)

  const loadMore = async () => {
    const nextIds = dedupedRefs.value
      .slice(visibleCount.value, visibleCount.value + pageSize)
      .map((r) => r.id)
    visibleCount.value += pageSize
    await resolveIds(nextIds.filter((id) => !resolved.value.has(id)))
  }

  return { refs, hasMore, loadMore, loading }
}
