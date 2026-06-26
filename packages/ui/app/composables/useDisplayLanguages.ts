import type { InjectionKey, Ref } from 'vue'
import { inject, provide, ref } from 'vue'

import { getLanguageByCode } from '../utils/iso639-helpers'

export interface DisplayLanguagesApi {
  languages: Ref<string[]>
  addLanguage?: (code: string) => void
  removeLanguage?: (code: string) => void
}

const displayLanguagesKey: InjectionKey<DisplayLanguagesApi> = Symbol('displayLanguages')

let defaultInstance: DisplayLanguagesApi | null = null

function toPart1(code: string): string | null {
  if (!code) return null
  const lower = code.toLowerCase()
  const entry = getLanguageByCode(lower)
  if (entry?.part1) {
    return entry.part1
  }
  if (lower.length >= 2 && /^[a-z]{2,3}$/.test(lower)) {
    return lower.slice(0, 2)
  }
  return null
}

function defaultFromNavigator(): string[] {
  if (typeof navigator === 'undefined' || !navigator.languages) {
    return ['en']
  }
  const seen = new Set<string>()
  const result: string[] = []
  for (const lang of navigator.languages) {
    const part1 = toPart1(lang)
    if (part1 && !seen.has(part1)) {
      seen.add(part1)
      result.push(part1)
    }
  }
  if (!seen.has('en')) {
    return ['en', ...result]
  }
  if (result[0] !== 'en') {
    return ['en', ...result.filter((l) => l !== 'en')]
  }
  return result
}

export function useDefaultDisplayLanguages(): DisplayLanguagesApi {
  if (defaultInstance) return defaultInstance
  const languages = ref<string[]>(defaultFromNavigator())
  defaultInstance = {
    languages,
    addLanguage: (code) => {
      const part1 = toPart1(code)
      if (!part1 || languages.value.includes(part1)) return
      languages.value = [...languages.value, part1]
    },
    removeLanguage: (code) => {
      const part1 = toPart1(code)
      if (!part1 || part1 === 'en') return
      languages.value = languages.value.filter((l) => l !== part1)
    },
  }
  return defaultInstance
}

export function provideDisplayLanguages(api: DisplayLanguagesApi) {
  provide(displayLanguagesKey, api)
  return api
}

export function useDisplayLanguages(): DisplayLanguagesApi {
  const injected = inject(displayLanguagesKey, null)
  if (injected) return injected
  return useDefaultDisplayLanguages()
}
