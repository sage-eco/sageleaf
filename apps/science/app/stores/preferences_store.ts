import { defineStore } from 'pinia'

function defaultDisplayLanguages(): string[] {
  if (typeof navigator === 'undefined' || !navigator.languages) {
    return ['en']
  }
  const seen = new Set<string>()
  const result: string[] = []
  for (const lang of navigator.languages) {
    const lower = lang?.toLowerCase?.() ?? ''
    const entry = getLanguageByCode(lower)
    const part1 = entry?.part1 ?? (/^[a-z]{2,3}(?:-|$)/.test(lower) ? lower.slice(0, 2) : null)
    if (part1 && !seen.has(part1)) {
      seen.add(part1)
      result.push(part1)
    }
  }
  if (!seen.has('en')) {
    return ['en', ...result]
  }
  return ['en', ...result.filter((l) => l !== 'en')]
}

export const usePreferencesStore = defineStore(
  'preferences',
  () => {
    const displayLanguages = ref<string[]>(defaultDisplayLanguages())

    function setDisplayLanguages(langs: string[]) {
      const cleaned = (langs ?? [])
        .map((l) => (typeof l === 'string' ? l.toLowerCase() : ''))
        .filter(Boolean)
      const withEn = cleaned.includes('en') ? cleaned : ['en', ...cleaned]
      displayLanguages.value = withEn
    }

    function addDisplayLanguage(code: string) {
      const lower = code?.toLowerCase?.() ?? ''
      if (!lower || displayLanguages.value.includes(lower)) return
      displayLanguages.value = [...displayLanguages.value, lower]
    }

    function removeDisplayLanguage(code: string) {
      const lower = code?.toLowerCase?.() ?? ''
      if (lower === 'en') return
      displayLanguages.value = displayLanguages.value.filter((l) => l !== lower)
    }

    return {
      displayLanguages,
      setDisplayLanguages,
      addDisplayLanguage,
      removeDisplayLanguage,
    }
  },
  { persist: true },
)
