import type { TypedDocumentNode } from '@graphql-typed-document-node/core'

import type { Exact } from '~/gql/graphql'

export function useModelFormSave(
  modelId: string,
  changeId: string | undefined,
  createModelKey: string,
  autoSave: boolean | undefined,
  createMutation: TypedDocumentNode<
    { [key: string]: unknown },
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input: any
    }
  >,
  updateMutation: TypedDocumentNode<
    { [key: string]: unknown },
    Exact<{
      input: {
        id: string
        [key: string]: unknown
      }
    }>
  >,
  createData: Ref<object>,
  updateData: Ref<object | null>,
  emits: (e: 'created' | 'saved', id: string) => void,
) {
  const create = useMutation(createMutation)
  const update = useMutation(updateMutation)

  const saveStatus = ref<'saving' | 'saved' | 'not_saved' | 'error'>(
    modelId === 'new' ? 'not_saved' : 'saved',
  )

  const runCreate = async (changeID: string | undefined) => {
    await create
      .mutate({
        input: {
          changeID,
          ...createData.value,
        },
      })
      .then((modelResult: { data?: unknown } | null) => {
        if (!modelResult?.data) {
          saveStatus.value = 'error'
          return
        }
        saveStatus.value = 'saved'
        const data = modelResult.data as Record<string, Record<string, unknown> | null>
        const createKey = Object.keys(data)[0]!
        const modelReturned = data[createKey]?.[createModelKey] as {
          id: string
        } | null
        if (modelReturned?.id) {
          emits('created', modelReturned.id)
          emits('saved', modelReturned.id)
        }
      })
      .catch(() => {
        saveStatus.value = 'error'
      })
  }

  const runUpdate = async (changeID: string | undefined) => {
    await update
      .mutate({
        input: {
          changeID,
          id: modelId,
          ...updateData.value,
        },
      })
      .then(() => {
        saveStatus.value = 'saved'
        emits('saved', modelId)
      })
      .catch(() => {
        saveStatus.value = 'error'
      })
  }

  if (changeId && autoSave && modelId === 'new') {
    watch(createData, async (newData) => {
      createData.value = newData
      await runCreate(changeId)
    })
  } else if (changeId && autoSave && modelId !== 'new') {
    watch(updateData, async (newData) => {
      updateData.value = newData
      await runUpdate(changeId)
    })
  }

  const saveForm = async () => {
    if (saveStatus.value === 'error') {
      return
    }
    if (modelId === 'new') {
      await runCreate(changeId || undefined)
    } else {
      await runUpdate(changeId || undefined)
    }
  }

  return { saveStatus, saveForm }
}
