import { Test, TestingModule } from '@nestjs/testing'
import { ClsService } from 'nestjs-cls'
import { I18nService as I18nBaseService } from 'nestjs-i18n'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { I18nService } from '@src/common/i18n.service'

describe('I18nService', () => {
  let service: I18nService
  let cls: { get: ReturnType<typeof vi.fn> }

  beforeEach(async () => {
    cls = { get: vi.fn() }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        I18nService,
        { provide: I18nBaseService, useValue: { t: vi.fn() } },
        { provide: ClsService, useValue: cls },
      ],
    }).compile()

    service = module.get(I18nService)
  })

  describe('filterByLocale', () => {
    test('returns empty array for undefined input', () => {
      cls.get.mockReturnValue(['en'])
      expect(service.filterByLocale(undefined)).toEqual([])
    })

    test('includes locale-less items and items matching the current lang', () => {
      cls.get.mockReturnValue(['sv'])
      const items = [
        { id: 'global', locale: undefined },
        { id: 'sv', locale: 'sv' },
        { id: 'en', locale: 'en' },
      ]
      expect(service.filterByLocale(items).map((i) => i.id)).toEqual(['global', 'sv'])
    })

    test('matches a full locale string like en-US;a against the base lang', () => {
      cls.get.mockReturnValue(['en'])
      const items = [
        { id: 'a', locale: 'en-US;a' },
        { id: 'b', locale: 'sv-SE' },
      ]
      expect(service.filterByLocale(items).map((i) => i.id)).toEqual(['a'])
    })
  })

  describe('pickByLocale', () => {
    test('returns undefined for undefined input', () => {
      cls.get.mockReturnValue(['en'])
      expect(service.pickByLocale(undefined)).toBeUndefined()
    })

    test('prefers an exact locale match over the locale-less fallback', () => {
      cls.get.mockReturnValue(['sv'])
      const items = [
        { id: 'global', locale: undefined },
        { id: 'sv', locale: 'sv' },
      ]
      expect(service.pickByLocale(items)?.id).toBe('sv')
    })

    test('falls back to the locale-less entry when no locale matches', () => {
      cls.get.mockReturnValue(['fr'])
      const items = [
        { id: 'global', locale: undefined },
        { id: 'sv', locale: 'sv' },
      ]
      expect(service.pickByLocale(items)?.id).toBe('global')
    })

    test('returns undefined when nothing matches and there is no fallback', () => {
      cls.get.mockReturnValue(['fr'])
      const items = [{ id: 'sv', locale: 'sv' }]
      expect(service.pickByLocale(items)).toBeUndefined()
    })

    test('matches a full locale string like en-US;a against the base lang', () => {
      cls.get.mockReturnValue(['en'])
      const items = [
        { id: 'global', locale: undefined },
        { id: 'en', locale: 'en-US;a' },
      ]
      expect(service.pickByLocale(items)?.id).toBe('en')
    })
  })
})
