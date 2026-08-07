import type { TypedDocumentNode } from '@graphql-typed-document-node/core'

import type { ChangeStatus } from '~/gql/graphql'

interface ChangeEditQueryShape {
  change?: {
    status?: ChangeStatus | null
    edits: { nodes: Array<{ updateInput?: Record<string, unknown> | null }> }
  } | null
}

interface DirectEditQueryShape {
  directEdit?: {
    id?: string | null
    updateInput?: Record<string, unknown> | null
  } | null
}

export function useModelEditData<
  TChangeQuery extends ChangeEditQueryShape,
  TDirectQuery extends DirectEditQueryShape,
>(
  modelId: string,
  changeId: string | undefined,
  createModelKey: string,
  jsonSchema: ComputedRef<unknown>,
  editQuery: TypedDocumentNode<TChangeQuery, { id: string; changeID: string }>,
  directEditQuery: TypedDocumentNode<TDirectQuery, { id: string; entityName: string }>,
) {
  const entityName = createModelKey.charAt(0).toUpperCase() + createModelKey.slice(1)
  const updateData = ref<object | null>(null)
  const changeStatus = ref<ChangeStatus | null>(null)

  if (modelId !== 'new' && changeId) {
    const useDirect = ref(false)
    const { result: changeResult, error: changeError } = useQuery(editQuery, {
      id: modelId,
      changeID: changeId,
    })
    watch(
      changeError,
      (err) => {
        if (err) useDirect.value = true
      },
      { immediate: true },
    )
    watch(
      [changeResult, jsonSchema],
      ([result, schema]) => {
        if (schema && result?.change?.edits.nodes && result.change.edits.nodes.length > 0) {
          updateData.value = sanitizeFormData(result.change.edits.nodes[0]?.updateInput)
        }
        if (result?.change?.status) {
          changeStatus.value = result.change.status
        }
      },
      { immediate: true },
    )
    const { result: directResult } = useQuery(directEditQuery, { id: modelId, entityName }, () => ({
      enabled: useDirect.value,
    }))
    watch(
      [directResult, jsonSchema],
      ([result, schema]) => {
        if (schema && result?.directEdit?.updateInput) {
          updateData.value = sanitizeFormData(result.directEdit.updateInput)
        }
      },
      { immediate: true },
    )
  } else if (modelId !== 'new') {
    const { result } = useQuery(directEditQuery, {
      id: modelId,
      entityName,
    })
    watch(
      [result, jsonSchema],
      ([result, schema]) => {
        if (schema && result?.directEdit?.id) {
          updateData.value = sanitizeFormData(result.directEdit.updateInput)
        }
      },
      { immediate: true },
    )
  }

  return { entityName, updateData, changeStatus }
}
