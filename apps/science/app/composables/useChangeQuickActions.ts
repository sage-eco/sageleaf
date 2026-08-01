import { Check, GitMerge, Plus, RotateCcw, Send, X } from '@lucide/vue'
import type { Component } from 'vue'

import { ChangeStatus } from '~/gql/graphql'

interface QuickAction {
  key: string
  label: string
  icon: Component
  handler: () => void | Promise<void>
}

export const useChangeQuickActions = (
  status: Ref<ChangeStatus | null | undefined>,
  isAdmin: Ref<boolean>,
  handlers: {
    onNew: () => void | Promise<void>
    onSetStatus: (status: ChangeStatus) => void | Promise<void>
    onMerge: () => void | Promise<void>
  },
) => {
  const actions = computed<QuickAction[]>(() => {
    const list: QuickAction[] = [{ key: 'new', label: 'New', icon: Plus, handler: handlers.onNew }]
    const s = status.value
    if (s === ChangeStatus.Draft) {
      list.push({
        key: 'propose',
        label: 'Propose',
        icon: Send,
        handler: () => handlers.onSetStatus(ChangeStatus.Proposed),
      })
    }
    if (s === ChangeStatus.Proposed) {
      list.push({
        key: 'draft',
        label: 'Back to Draft',
        icon: RotateCcw,
        handler: () => handlers.onSetStatus(ChangeStatus.Draft),
      })
    }
    if (isAdmin.value && (s === ChangeStatus.Approved || s === ChangeStatus.Rejected)) {
      list.push({
        key: 'propose',
        label: 'Propose',
        icon: Send,
        handler: () => handlers.onSetStatus(ChangeStatus.Proposed),
      })
    }
    if (isAdmin.value && s === ChangeStatus.Proposed) {
      list.push({
        key: 'approve',
        label: 'Approve',
        icon: Check,
        handler: () => handlers.onSetStatus(ChangeStatus.Approved),
      })
      list.push({
        key: 'reject',
        label: 'Reject',
        icon: X,
        handler: () => handlers.onSetStatus(ChangeStatus.Rejected),
      })
    }
    if (isAdmin.value && s === ChangeStatus.Approved) {
      list.push({ key: 'merge', label: 'Merge', icon: GitMerge, handler: handlers.onMerge })
    }
    return list
  })
  return { actions }
}
