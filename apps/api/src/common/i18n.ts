import _ from 'lodash'
import { z } from 'zod/v4'

import { map2to3, map3to2 } from '@src/db/iso639'

export const Locales = ['en-US', 'sv-SE'] as const

export type LocaleType = (typeof Locales)[number]

// Default language is represented as 'xx' in the database
// and it can only be saved when there no other known languages
// set and the input is of an unknown language.
const validFields = ['xx', ...Locales]
for (const lang of Locales) {
  validFields.push(lang.split('-')[0])
}
export const TranslatedJSONSchema = z.record(z.string(), z.string()).refine(
  (data) => {
    const keys = Object.keys(data)
    for (const key of keys) {
      const keyParts = key.split(';')
      const keyLang = keyParts[0].split('-')[0]
      if (keyLang.length < 2 || keyLang.length > 3) {
        return false
      }
      if (keyParts.length > 1 && keyParts[1] !== 'a') {
        return false
      }
      if (!data[key]) {
        return false
      }
    }
    return true
  },
  {
    error: 'Invalid translated field',
  },
)

type TF = z.infer<typeof TranslatedJSONSchema>
export type TranslatedField = TF

export function defaultTranslatedField(): TranslatedField {
  return {}
}

export const LANG_REGEX = /^[a-z]{2,3}(-[A-Z]{2,8}(-[^-]{2,8})?)?$/
export const TranslatedInputSchema = z.object({
  lang: z.string().regex(LANG_REGEX).meta({
    id: 'lang',
    title: 'Language Code',
  }),
  text: z.string().max(100_000).optional(),
  auto: z.boolean().default(false),
})
export const TrArraySchema = z.array(TranslatedInputSchema).optional()

export type TrArray = z.infer<typeof TrArraySchema>

export function requireNameOrNameTr(
  input: { name?: string; nameTr?: TrArray },
  ctx: z.RefinementCtx,
) {
  if (!input.name && !input.nameTr?.length) {
    ctx.addIssue({
      code: 'custom',
      path: ['name'],
      message: 'Either "name" or "nameTr" is required',
    })
  }
}

export function isTranslatedField(data: Record<string, any>): data is TranslatedField {
  const result = TranslatedJSONSchema.safeParse(data)
  return result.success
}

const supported = Locales.map((support) => {
  const bits = support.split('-')
  const hasScript = bits.length === 3

  return {
    text: support,
    code: bits[0],
    script: hasScript ? bits[1] : null,
    region: hasScript ? bits[2] : bits[1],
  }
}).sort((a, b) => {
  return b.code.length - a.code.length
})

export function parseLanguageHeader(header: string, fallback?: string): string[] {
  // From https://github.com/opentable/accept-language-parser
  const strings: string[] = header.split(',')
  const langs = strings
    .map((m) => {
      if (!m) {
        return null
      }

      const bits = m.split(';')
      const ietf = bits[0].split('-')
      const hasScript = ietf.length === 3

      return {
        code: ietf[0],
        script: hasScript ? ietf[1] : null,
        region: hasScript ? ietf[2] : ietf[1],
        quality: bits[1] ? parseFloat(bits[1].split('=')[1]) : 1.0,
      }
    })
    .filter((r) => {
      return !!r
    })
    .sort((a, b) => {
      return b.quality - a.quality
    })

  const localeTypes: string[] = []
  for (let i = 0; i < langs.length; i++) {
    const lang = langs[i]
    const langCode = lang.code.toLowerCase()
    const langRegion = lang.region ? lang.region.toLowerCase() : lang.region
    const langScript = lang.script ? lang.script.toLowerCase() : lang.script
    let matched = false
    for (let j = 0; j < supported.length; j++) {
      const supportedCode = supported[j].code.toLowerCase()
      const supportedScript = supported[j].script
        ? (supported[j].script as string).toLowerCase()
        : supported[j].script
      const supportedRegion = supported[j].region
        ? supported[j].region.toLowerCase()
        : supported[j].region
      if (
        langCode === supportedCode &&
        (!langScript || langScript === supportedScript) &&
        (!langRegion || langRegion === supportedRegion) &&
        !_.find(localeTypes, (l) => l === supported[j].text)
      ) {
        localeTypes.push(supported[j].text)
        localeTypes.push(supported[j].code)
        const iso3 = map2to3[supported[j].code]
        if (iso3 && !localeTypes.includes(iso3)) {
          localeTypes.push(iso3)
        }
        matched = true
      }
    }
    if (!matched) {
      if (!localeTypes.includes(langCode)) {
        localeTypes.push(langCode)
      }
      const iso3 = map2to3[langCode]
      if (iso3 && !localeTypes.includes(iso3)) {
        localeTypes.push(iso3)
      }
      const iso2 = map3to2[langCode]
      if (iso2 && !localeTypes.includes(iso2)) {
        localeTypes.push(iso2)
      }
    }
  }
  if (fallback && localeTypes.length === 0) {
    localeTypes.push(fallback)
  }
  return localeTypes
}

// Flattens a TranslatedField object into an object where each key is prepended
// by the name of the field.
// {"en": "Hello", "sv": "Hej"} => {"name_en": "Hello", "name_sv": "Hej"}
export function flattenTr(fieldName: string, obj: TranslatedField) {
  const result: Record<string, string> = {}
  for (const key in obj) {
    const value = obj[key]
    if (value) {
      result[`${fieldName}_${key}`] = value
    }
  }
  return result
}
