import type { TypedDocumentNode } from '@graphql-typed-document-node/core'

const pageSize = 10

type ConnectionVars = {
  id: string
  first?: number
  last?: number
  after?: string | null
  before?: string | null
}

export function useRelationPager<TResult>(
  query: TypedDocumentNode<TResult, ConnectionVars>,
  rootField: string,
  relationField: string,
  id: MaybeRefOrGetter<string>,
) {
  const { result, refetch } = useQuery(
    query,
    () =>
      ({
        id: toValue(id),
        first: pageSize,
        last: undefined,
        after: null,
        before: null,
      }) as ConnectionVars,
  )

  const connection = computed(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    () => (result.value as any)?.[rootField]?.[relationField],
  )
  const nodes = computed(() => connection.value?.nodes ?? [])
  const totalCount = computed<number | null>(() => connection.value?.totalCount ?? null)
  const hasPreviousPage = computed(() => connection.value?.pageInfo?.hasPreviousPage ?? false)
  const hasNextPage = computed(() => connection.value?.pageInfo?.hasNextPage ?? false)

  const prevPage = () =>
    refetch({
      id: toValue(id),
      first: undefined,
      last: pageSize,
      after: null,
      before: connection.value?.pageInfo?.startCursor ?? null,
    })
  const nextPage = () =>
    refetch({
      id: toValue(id),
      first: pageSize,
      last: undefined,
      before: null,
      after: connection.value?.pageInfo?.endCursor ?? null,
    })

  return { nodes, totalCount, hasPreviousPage, hasNextPage, prevPage, nextPage }
}
