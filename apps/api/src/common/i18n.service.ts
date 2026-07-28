import { Injectable } from '@nestjs/common'
import { GraphQLError } from 'graphql'
import _ from 'lodash'
import { ClsService } from 'nestjs-cls'
import { I18nService as I18nBaseService, Path, PathValue, TranslateOptions } from 'nestjs-i18n'
import { IfAnyOrNever } from 'nestjs-i18n/dist/types'
import { z } from 'zod/v4'

import { LANG_REGEX, TranslatedField, TrArray, TrArraySchema } from '@src/common/i18n'
import { I18nTranslations } from '@src/i18n/i18n.generated'

@Injectable()
export class I18nService {
  constructor(
    private readonly i18n: I18nBaseService<I18nTranslations>,
    private readonly cls: ClsService,
  ) {}

  t<P extends Path<I18nTranslations> = any, R = PathValue<I18nTranslations, P>>(
    key: P,
    options?: TranslateOptions,
  ): IfAnyOrNever<R, string, R> {
    return this.i18n.t(key, options)
  }

  // Returns the 2-3 letter lang code for the current request (e.g. 'en', 'sv')
  getLang(): string {
    const langs: string[] = this.cls.get('lang') || []
    return langs[0]?.split('-')[0] ?? 'en'
  }

  // Reduces e.g. 'en-US;a' to 'en', matching TranslatedField key conventions
  private localeMatchesLang(locale: string | undefined, lang: string): boolean {
    return !!locale && locale.split(';')[0].split('-')[0] === lang
  }

  // Filters a `{ locale?: string }[]` array to items with no locale (global/default)
  // plus items matching the current request language. Used for e.g. social.links.
  filterByLocale<T extends { locale?: string }>(items?: T[]): T[] {
    if (!items) return []
    const lang = this.getLang()
    return items.filter((item) => !item.locale || this.localeMatchesLang(item.locale, lang))
  }

  // Picks a single item from a `{ locale?: string }[]` array: prefers an exact
  // locale match, falls back to the locale-less entry. Used for e.g. instructions.primaryLinks.
  pickByLocale<T extends { locale?: string }>(items?: T[]): T | undefined {
    if (!items) return undefined
    const lang = this.getLang()
    return (
      items.find((item) => this.localeMatchesLang(item.locale, lang)) ??
      items.find((item) => !item.locale)
    )
  }

  // Picks the appropriate translation for the current request language.
  tr(field: TranslatedField | string | undefined): string | undefined {
    return this.pick(field) as string | undefined
  }

  // Generic helper to pick the appropriate localized value from a record
  // based on the current request language preference.
  pick<T>(field: Record<string, T> | string | undefined): T | string | undefined {
    if (typeof field === 'string') {
      return field
    }
    if (!field) {
      return undefined
    }
    const lang: string[] = this.cls.get('lang') || []
    for (const l of lang) {
      const exactKey = _.findKey(field, (_value: any, key: string) => {
        return l === key.split(';')[0]
      })
      if (exactKey) {
        return (field as any)[exactKey]
      }
      const inexactKey = _.findKey(field, (_value: any, key: string) => {
        const bits = key.split(';')
        return l === bits[0].split('-')[0] || bits[0].startsWith(l)
      })
      if (inexactKey) {
        return (field as any)[inexactKey]
      }
    }
    return field.en || field.xx
  }

  // Modifies a TranslatedField JSON object to add a new translation.
  // Supports a single string or an array of lang, text objects.
  addTr(
    current: TranslatedField | undefined,
    value: string | TrArray,
    lang?: string | string[],
    auto?: boolean,
  ): TranslatedField | undefined {
    if (!value) {
      return current
    }
    if (Array.isArray(value)) {
      const arrSchema = TrArraySchema.transform((arr, ctx) => {
        if (!arr) return current
        const seenLangs = new Set<string>()
        const output: Record<string, string> = {}
        for (const item of arr) {
          if (seenLangs.has(item.lang)) {
            ctx.addIssue({
              code: 'invalid_key',
              input: item.lang,
              origin: 'record',
              issues: [
                {
                  code: 'custom',
                  input: item.lang,
                  path: ['lang'],
                  message: `Duplicate language code: ${item.lang}`,
                },
              ],
            })
            return z.NEVER
          }
          seenLangs.add(item.lang)
          let key: string = item.lang
          if (item.auto) {
            key += ';a'
          }
          if (item.text && item.text.length > 0) {
            output[key] = item.text
          }
        }
        if (Object.keys(output).length === 0) {
          ctx.addIssue({
            code: 'custom',
            input: arr,
            message: 'At least one translation must have non-empty text',
          })
          return z.NEVER
        }
        return output
      })
      const result = arrSchema.safeParse(value)
      if (result.success) {
        current = {
          ...current,
          ...result.data,
        }
        return current
      } else {
        throw result.error
      }
    }

    const reqLang = this.cls.get('lang')
    const langResult = z
      .union([z.string().regex(LANG_REGEX), z.array(z.string().regex(LANG_REGEX))])
      .default(reqLang)
      .transform((lang, ctx) => {
        // Always use the first (preferred) language if multiple are provided
        if (Array.isArray(lang)) {
          return lang[0]
        }
        return lang
      })
      .safeParse(lang)
    if (!langResult.success) {
      throw langResult.error
    }
    const valueResult = z.string().max(100_000).safeParse(value)
    if (!valueResult.success) {
      throw valueResult.error
    }

    let langStr = langResult.data
    if (!langStr) {
      throw new GraphQLError(
        'A language code is required for text input (provide either an "Accept-Language" header or the "lang" query parameter)',
      )
    }
    const bits = langStr.split('-')
    if (bits.length >= 2) {
      langStr = bits[0]
    }
    if (auto) {
      langStr = `${langStr};a`
    }
    if (!current) current = {}
    current[langStr] = valueResult.data
    return current
  }

  // Like addTr, but throws an error if the resulting object
  // is nullish (JSON object must have at least one translation).
  addTrReq(
    current: TranslatedField,
    value: string | TrArray,
    lang?: string | string[],
    auto?: boolean,
  ): TranslatedField {
    const tr = this.addTr(current, value, lang, auto)
    if (!tr) {
      throw new GraphQLError('Invalid translated field')
    }
    return tr
  }
}
