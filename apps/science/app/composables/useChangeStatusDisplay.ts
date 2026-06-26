import { ChangeStatus } from '~/gql/graphql'

export const useChangeStatusDisplay = (status: Ref<string | null | undefined>) => {
  const badgeClass = computed(() => {
    switch (status.value) {
      case ChangeStatus.Draft:
        return 'badge-warning'
      case ChangeStatus.Proposed:
        return 'badge-info'
      case ChangeStatus.Approved:
        return 'badge-success'
      case ChangeStatus.Merged:
        return 'badge-primary'
      case ChangeStatus.Rejected:
        return 'badge-error'
      default:
        return 'badge-outline'
    }
  })

  const borderClass = computed(() => {
    switch (status.value) {
      case ChangeStatus.Merged:
        return 'border-primary/30 bg-primary/10'
      case ChangeStatus.Proposed:
        return 'border-info/30 bg-info/10'
      case ChangeStatus.Approved:
        return 'border-success/30 bg-success/10'
      case ChangeStatus.Draft:
        return 'border-warning/30 bg-warning/10'
      case ChangeStatus.Rejected:
        return 'border-error/30 bg-error/10'
      default:
        return 'border-base-300 bg-base-200'
    }
  })

  const text = computed(() => {
    switch (status.value) {
      case ChangeStatus.Draft:
        return 'Ready to propose for review'
      case ChangeStatus.Proposed:
        return 'Awaiting approval'
      case ChangeStatus.Approved:
        return 'Approved and ready to merge'
      case ChangeStatus.Rejected:
        return 'This change was rejected'
      case ChangeStatus.Merged:
        return 'This change has been merged'
      default:
        return ''
    }
  })

  return { badgeClass, borderClass, text }
}

export const formatDate = (d: string | Date | null | undefined) => {
  if (!d) return ''
  return new Date(d).toLocaleString()
}
