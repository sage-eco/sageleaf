import { beforeEach, describe, expect, test } from 'vitest'

import { Source } from '@src/changes/source.model'
import { SourceSchemaService } from '@src/changes/source.schema'
import { I18nService } from '@src/common/i18n.service'
import { ZService } from '@src/common/z.service'

const fakeI18n = new I18nService({ t: (key: string) => key } as any, { get: () => [] } as any)

describe('SourceSchemaService transform', () => {
  let zService: ZService

  beforeEach(() => {
    zService = new ZService(fakeI18n)
    // eslint-disable-next-line no-new -- constructor registers the transform with zService
    new SourceSchemaService(zService)
  })

  test('resolves user from a flattened POJO id (history diff shape)', async () => {
    const pojo = {
      id: 'source-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      type: 'DOCUMENT',
      user: 'user-1',
    }

    const model = await zService.objectToModel(Source, pojo)

    expect(model.user?.id).toBe('user-1')
  })
})
