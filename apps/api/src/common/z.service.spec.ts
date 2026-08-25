import type { Ref } from '@mikro-orm/postgresql'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { I18nService } from '@src/common/i18n.service'
import { ZService } from '@src/common/z.service'
import { Region } from '@src/geo/region.model'

describe('ZService.refToModel', () => {
  let zService: ZService

  beforeEach(() => {
    zService = new ZService({} as I18nService)
  })

  test('returns a stub model with just id when given a plain string id', async () => {
    const result = await zService.refToModel(Region, 'region-1')

    expect(result).toBeInstanceOf(Region)
    expect(result?.id).toBe('region-1')
    expect(result?.name).toBeUndefined()
  })

  test('returns a stub model with just id when given a plain { id } object', async () => {
    const result = await zService.refToModel(Region, { id: 'region-2' })

    expect(result).toBeInstanceOf(Region)
    expect(result?.id).toBe('region-2')
  })

  test('returns undefined for null', async () => {
    expect(await zService.refToModel(Region, null)).toBeUndefined()
  })

  test('returns undefined for undefined', async () => {
    expect(await zService.refToModel(Region, undefined)).toBeUndefined()
  })

  test('resolves a real Ref via entityToModel instead of treating it as an id-only stub', async () => {
    const fakeEntity = { constructor: { name: 'Region' } }
    const fakeRef = {
      isInitialized: () => true,
      getEntity: () => fakeEntity,
    } as unknown as Ref<any>

    const entityToModelSpy = vi
      .spyOn(zService, 'entityToModel')
      .mockResolvedValue(new Region() as any)

    const result = await zService.refToModel(Region, fakeRef)

    expect(entityToModelSpy).toHaveBeenCalledWith(Region, fakeEntity)
    expect(result).toBeInstanceOf(Region)
  })
})
