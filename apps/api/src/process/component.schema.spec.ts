import { beforeEach, describe, expect, test } from 'vitest'

import { BaseSchemaService } from '@src/common/base.schema'
import { I18nService } from '@src/common/i18n.service'
import { ZService } from '@src/common/z.service'
import { Component } from '@src/process/component.model'
import { ComponentSchemaService } from '@src/process/component.schema'

const fakeI18n = new I18nService({ t: (key: string) => key } as any, { get: () => [] } as any)

describe('ComponentSchemaService transform', () => {
  let zService: ZService

  beforeEach(() => {
    zService = new ZService(fakeI18n)
    const baseSchema = new BaseSchemaService(fakeI18n)
    // eslint-disable-next-line no-new -- constructor registers the transform with zService
    new ComponentSchemaService(fakeI18n, baseSchema, zService)
  })

  test('resolves region and primaryMaterial from flattened POJO ids (history diff shape)', async () => {
    const pojo = {
      id: 'component-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      name: 'Some Component',
      region: 'region-1',
      primaryMaterial: 'material-1',
    }

    const model = await zService.objectToModel(Component, pojo)

    expect(model.region?.id).toBe('region-1')
    expect(model.primaryMaterial?.id).toBe('material-1')
  })

  test('leaves region and primaryMaterial undefined when absent', async () => {
    const pojo = {
      id: 'component-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      name: 'Some Component',
    }

    const model = await zService.objectToModel(Component, pojo)

    expect(model.region).toBeUndefined()
    expect(model.primaryMaterial).toBeUndefined()
  })
})
