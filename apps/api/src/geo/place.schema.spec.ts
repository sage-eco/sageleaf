import { beforeEach, describe, expect, test } from 'vitest'

import { BaseSchemaService } from '@src/common/base.schema'
import { I18nService } from '@src/common/i18n.service'
import { ZService } from '@src/common/z.service'
import { Place } from '@src/geo/place.model'
import { PlaceSchemaService } from '@src/geo/place.schema'

const fakeI18n = new I18nService({ t: (key: string) => key } as any, { get: () => [] } as any)

describe('PlaceSchemaService transform', () => {
  let zService: ZService

  beforeEach(() => {
    zService = new ZService(fakeI18n)
    const baseSchema = new BaseSchemaService(fakeI18n)
    // eslint-disable-next-line no-new -- constructor registers the transform with zService
    new PlaceSchemaService(fakeI18n, baseSchema, zService)
  })

  test('resolves org from a flattened POJO id (history diff shape)', async () => {
    const pojo = {
      id: 'place-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      name: 'Some Place',
      org: 'org-1',
    }

    const model = await zService.objectToModel(Place, pojo)

    expect(model.org?.id).toBe('org-1')
  })

  test('leaves org undefined when absent', async () => {
    const pojo = {
      id: 'place-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      name: 'Some Place',
    }

    const model = await zService.objectToModel(Place, pojo)

    expect(model.org).toBeUndefined()
  })
})
