import { beforeEach, describe, expect, test } from 'vitest'

import { BaseSchemaService } from '@src/common/base.schema'
import { I18nService } from '@src/common/i18n.service'
import { ZService } from '@src/common/z.service'
import { Process } from '@src/process/process.model'
import { ProcessSchemaService } from '@src/process/process.schema'

const fakeI18n = new I18nService({ t: (key: string) => key } as any, { get: () => [] } as any)

describe('ProcessSchemaService transform', () => {
  let zService: ZService

  beforeEach(() => {
    zService = new ZService(fakeI18n)
    const baseSchema = new BaseSchemaService(fakeI18n)
    // eslint-disable-next-line no-new -- constructor registers the transform with zService
    new ProcessSchemaService(fakeI18n, baseSchema, zService)
  })

  test('resolves material, variant, org, region and place from flattened POJO ids (history diff shape)', async () => {
    const pojo = {
      id: 'process-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      name: 'Some Process',
      material: 'material-1',
      variant: 'variant-1',
      org: 'org-1',
      region: 'region-1',
      place: 'place-1',
    }

    const model = await zService.objectToModel(Process, pojo)

    expect(model.material?.id).toBe('material-1')
    expect(model.variant?.id).toBe('variant-1')
    expect(model.org?.id).toBe('org-1')
    expect(model.region?.id).toBe('region-1')
    expect(model.place?.id).toBe('place-1')
  })

  test('leaves relations undefined when absent', async () => {
    const pojo = {
      id: 'process-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      name: 'Some Process',
    }

    const model = await zService.objectToModel(Process, pojo)

    expect(model.material).toBeUndefined()
    expect(model.variant).toBeUndefined()
    expect(model.org).toBeUndefined()
    expect(model.region).toBeUndefined()
    expect(model.place).toBeUndefined()
  })
})
