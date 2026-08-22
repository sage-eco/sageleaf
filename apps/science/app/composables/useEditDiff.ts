import type { Ref } from 'vue'

export type EditView = 'diff' | 'raw' | 'graph'

export type DiffKind = 'added' | 'removed' | 'modified'

export interface DiffEntry {
  key: string
  kind: DiffKind
  oldValue: unknown
  newValue: unknown
}

const stringify = (v: unknown): string => {
  if (v === undefined) return ''
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

export const useEditDiff = (
  edit: Ref<{ originalJSON?: unknown; changesJSON?: unknown } | null>,
) => {
  const editView = ref<EditView>('graph')

  const diffs = computed<DiffEntry[]>(() => {
    if (!edit.value) return []
    const original = (edit.value.originalJSON ?? null) as Record<string, unknown> | null
    const updated = (edit.value.changesJSON ?? null) as Record<string, unknown> | null
    if (!original && !updated) return []

    const out: DiffEntry[] = []
    const keys = new Set<string>([...Object.keys(original ?? {}), ...Object.keys(updated ?? {})])

    for (const key of keys) {
      const oldVal = original ? original[key] : undefined
      const newVal = updated ? updated[key] : undefined
      const inOriginal = original ? key in original : false
      const inUpdated = updated ? key in updated : false

      if (inOriginal && inUpdated) {
        if (stringify(oldVal) !== stringify(newVal)) {
          out.push({ key, kind: 'modified', oldValue: oldVal, newValue: newVal })
        }
      } else if (inUpdated) {
        out.push({ key, kind: 'added', oldValue: undefined, newValue: newVal })
      } else if (inOriginal) {
        out.push({ key, kind: 'removed', oldValue: oldVal, newValue: undefined })
      }
    }
    return out
  })

  const diffClass = (kind: DiffKind) => {
    switch (kind) {
      case 'added':
        return 'border-success/40 bg-success/10'
      case 'modified':
        return 'border-warning/40 bg-warning/10'
      case 'removed':
        return 'border-error/40 bg-error/10'
    }
  }

  const diffBadgeClass = (kind: DiffKind) => {
    switch (kind) {
      case 'added':
        return 'badge-success'
      case 'modified':
        return 'badge-warning'
      case 'removed':
        return 'badge-error'
    }
  }

  const diffSymbol = (kind: DiffKind) => {
    switch (kind) {
      case 'added':
        return '+'
      case 'modified':
        return '~'
      case 'removed':
        return '-'
    }
  }

  const formatValue = (v: unknown) => {
    if (v === undefined) return 'undefined'
    if (v === null) return 'null'
    if (typeof v === 'string') return v
    if (typeof v === 'number' || typeof v === 'boolean') return String(v)
    return stringify(v)
  }

  const resetView = () => {
    editView.value = 'graph'
  }

  return {
    editView,
    diffs,
    diffClass,
    diffBadgeClass,
    diffSymbol,
    formatValue,
    resetView,
  }
}
