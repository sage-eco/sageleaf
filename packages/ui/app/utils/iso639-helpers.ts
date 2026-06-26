import { iso639, map2to3 } from './iso639'

export interface LanguageEntry {
  nativeName: string
  nativeNameVariant?: string
  referenceName: string
  part1: string
  part2t: string
  part2b: string
  part6: string | null
}

const iso639List = Object.values(iso639) as LanguageEntry[]

export const supportedLanguages: LanguageEntry[] = iso639List.filter((entry) => !!entry.part1)

export const part1ToEntry: Record<string, LanguageEntry> = Object.fromEntries(
  supportedLanguages.map((entry) => [entry.part1, entry]),
)

export function getLanguageByCode(code: string): LanguageEntry | undefined {
  if (!code) return undefined
  const lower = code.toLowerCase()
  const code3 = (map2to3 as Record<string, string>)[lower]
  if (code3 && (iso639 as Record<string, LanguageEntry>)[code3]) {
    return (iso639 as Record<string, LanguageEntry>)[code3]
  }
  if ((iso639 as Record<string, LanguageEntry>)[lower]) {
    return (iso639 as Record<string, LanguageEntry>)[lower]
  }
  return part1ToEntry[lower]
}
