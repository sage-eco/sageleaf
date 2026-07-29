import { describe, expect, test } from 'vitest'

import { EditService } from './edit.service'

// Minimal mock of EntityManager — only getMetadata().get() is needed
function makeService(metaMap: Record<string, any>) {
  const em = {
    getMetadata: () => ({ get: (name: string) => metaMap[name] }),
    getReference: (_entity: any, id: string) => ({ id }),
  } as any
  return new EditService(em, {} as any, {} as any)
}

// Minimal entity stub
function makeEntity(pojo: Record<string, any>) {
  return { id: pojo.id ?? 'entity-id', toPOJO: () => ({ ...pojo }) } as any
}

describe('EditService.entityToChangePOJO', () => {
  test('m:n owning → excluded', () => {
    const svc = makeService({
      Item: {
        relations: [{ name: 'categories', kind: 'm:n', pivotEntity: 'ItemsCategories' }],
      },
    })
    const result = svc.entityToChangePOJO(
      'Item',
      makeEntity({ id: 'e1', categories: [{ id: 'c1' }] }),
    )
    expect(result).not.toHaveProperty('categories')
  })

  test('m:n inverse (mappedBy) → excluded', () => {
    const svc = makeService({
      Category: {
        relations: [{ name: 'items', kind: 'm:n', mappedBy: 'categories' }],
      },
    })
    const result = svc.entityToChangePOJO(
      'Category',
      makeEntity({ id: 'c1', items: [{ id: 'i1' }] }),
    )
    expect(result).not.toHaveProperty('items')
  })

  test('1:m to pivot target → included, primary-key refs flattened', () => {
    const svc = makeService({
      Variant: {
        relations: [
          { name: 'orgs', kind: 'm:n', pivotEntity: 'VariantsOrgs' },
          {
            name: 'variantOrgs',
            kind: '1:m',
            targetMeta: {
              className: 'VariantsOrgs',
              relations: [
                { kind: 'm:1', primary: true, targetMeta: { className: 'Variant' } },
                { kind: 'm:1', primary: true, targetMeta: { className: 'Org' } },
              ],
            },
          },
        ],
      },
    })
    const result = svc.entityToChangePOJO(
      'Variant',
      makeEntity({
        id: 'v1',
        orgs: [{ id: 'o1' }],
        variantOrgs: [{ variant: { id: 'v1' }, org: { id: 'o1' } }],
      }),
    ) as any
    expect(result).not.toHaveProperty('orgs')
    expect(result.variantOrgs).toEqual([{ variant: 'v1', org: 'o1' }])
  })

  test('1:m to pivot target: non-primary M:1 inside item also flattened', () => {
    const svc = makeService({
      Variant: {
        relations: [
          { name: 'orgs', kind: 'm:n', pivotEntity: 'VariantsOrgs' },
          {
            name: 'variantOrgs',
            kind: '1:m',
            targetMeta: {
              className: 'VariantsOrgs',
              relations: [
                { kind: 'm:1', primary: true, targetMeta: { className: 'Variant' } },
                { kind: 'm:1', primary: true, targetMeta: { className: 'Org' } },
              ],
            },
          },
        ],
      },
    })
    const result = svc.entityToChangePOJO(
      'Variant',
      makeEntity({
        id: 'v1',
        variantOrgs: [
          {
            variant: { id: 'v1' },
            org: { id: 'o1' },
            region: { id: 'r1', name: 'Region X', placetype: 'region' },
          },
        ],
      }),
    ) as any
    expect(result.variantOrgs).toEqual([{ variant: 'v1', org: 'o1', region: 'r1' }])
  })

  test('1:m to tree entity → included with refs flattened', () => {
    const svc = makeService({
      Category: {
        relations: [
          {
            name: 'ancestors',
            kind: '1:m',
            targetMeta: {
              className: 'CategoryTree',
              relations: [
                { kind: 'm:1', primary: true, targetMeta: { className: 'Category' } },
                { kind: 'm:1', primary: true, targetMeta: { className: 'Category' } },
              ],
            },
          },
        ],
      },
    })
    const result = svc.entityToChangePOJO(
      'Category',
      makeEntity({
        id: 'c1',
        ancestors: [{ ancestor: { id: 'a1' }, descendant: { id: 'd1' }, depth: '1' }],
      }),
    ) as any
    expect(result.ancestors).toEqual([{ ancestor: 'a1', descendant: 'd1', depth: '1' }])
  })

  test('1:m to regular entity → excluded', () => {
    const svc = makeService({
      Region: {
        relations: [
          {
            name: 'variants',
            kind: '1:m',
            targetMeta: {
              className: 'Variant',
              relations: [{ kind: 'm:1', primary: false, targetMeta: { className: 'Region' } }],
            },
          },
        ],
      },
    })
    const result = svc.entityToChangePOJO(
      'Region',
      makeEntity({ id: 'r1', variants: [{ id: 'v1' }] }),
    )
    expect(result).not.toHaveProperty('variants')
  })

  test('m:1 non-primary → flattened to string ID', () => {
    const svc = makeService({
      Variant: {
        relations: [{ name: 'region', kind: 'm:1', primary: false }],
      },
    })
    const result = svc.entityToChangePOJO(
      'Variant',
      makeEntity({ id: 'v1', region: { id: 'r1', name: 'Region X' } }),
    ) as any
    expect(result.region).toBe('r1')
  })

  test('m:1 primary → excluded', () => {
    const svc = makeService({
      VariantsOrgs: {
        relations: [{ name: 'variant', kind: 'm:1', primary: true }],
      },
    })
    const result = svc.entityToChangePOJO(
      'VariantsOrgs',
      makeEntity({ id: 'pivot1', variant: { id: 'v1' } }),
    )
    expect(result).not.toHaveProperty('variant')
  })

  test('history* relation → excluded', () => {
    const svc = makeService({
      Variant: {
        relations: [
          {
            name: 'historyRecords',
            kind: '1:m',
            targetMeta: { className: 'VariantHistory', relations: [] },
          },
        ],
      },
    })
    const result = svc.entityToChangePOJO(
      'Variant',
      makeEntity({ id: 'v1', historyRecords: [{ id: 'h1' }] }),
    )
    expect(result).not.toHaveProperty('historyRecords')
  })

  test('createdAt and updatedAt → excluded', () => {
    const svc = makeService({
      Variant: { relations: [] },
    })
    const result = svc.entityToChangePOJO(
      'Variant',
      makeEntity({ id: 'v1', name: 'X', createdAt: '2024-01-01', updatedAt: '2024-01-02' }),
    )
    expect(result).not.toHaveProperty('createdAt')
    expect(result).not.toHaveProperty('updatedAt')
    expect((result as any).name).toBe('X')
  })
})

describe('EditService.changePOJOToEntity', () => {
  function makeServiceWithMeta(metaMap: Record<string, any>, entityID: string, dbEntity: any) {
    const forkedEm = {
      create: (_entityName: any, data: any) => {
        const merged = { ...dbEntity, ...data }
        // Attach a mock __helper so wrap(merged) short-circuits to this object
        // instead of calling EntityHelper.decorate which requires real MikroORM internals.
        Object.defineProperty(merged, '__helper', {
          value: { assign: (d: any) => Object.assign(merged, d) },
          enumerable: false,
          configurable: true,
        })
        return merged
      },
      clear: () => {},
    }
    const em = {
      getMetadata: () => ({ get: (name: string) => metaMap[name] }),
      assign: (entity: any, data: any) => Object.assign(entity, data),
      fork: () => forkedEm,
      getReference: (_entity: any, id: string) => ({ id }),
    } as any
    const metaService = {
      findEntityService: () => [
        null,
        {
          findOneByID: async (id: string) => (id === entityID ? dbEntity : null),
        },
      ],
    } as any
    return new EditService(em, {} as any, metaService)
  }

  test('m:1 non-primary string ID → restored to {id: string}', async () => {
    const dbEntity = { id: 'v1', material: null, isInitialized: () => true } as any
    const svc = makeServiceWithMeta(
      {
        Variant: {
          relations: [{ name: 'material', kind: 'm:1', primary: false }],
        },
      },
      'v1',
      dbEntity,
    )
    const result = (await svc.changePOJOToEntity('Variant', { id: 'v1', material: 'mat-1' })) as any
    expect(result.material).toEqual({ id: 'mat-1' })
  })

  test('m:1 non-primary already an object → left as-is', async () => {
    const dbEntity = { id: 'v1', material: null, isInitialized: () => true } as any
    const svc = makeServiceWithMeta(
      {
        Variant: {
          relations: [{ name: 'material', kind: 'm:1', primary: false }],
        },
      },
      'v1',
      dbEntity,
    )
    const result = (await svc.changePOJOToEntity('Variant', {
      id: 'v1',
      material: { id: 'mat-1' },
    })) as any
    expect(result.material).toEqual({ id: 'mat-1' })
  })

  test('1:m to pivot: item relation fields as strings → restored to {id: string}', async () => {
    const dbEntity = { id: 'v1', variantOrgs: [], isInitialized: () => true } as any
    const svc = makeServiceWithMeta(
      {
        Variant: {
          relations: [
            { name: 'orgs', kind: 'm:n', pivotEntity: 'VariantsOrgs' },
            {
              name: 'variantOrgs',
              kind: '1:m',
              targetMeta: {
                className: 'VariantsOrgs',
                relations: [
                  {
                    name: 'variant',
                    kind: 'm:1',
                    primary: true,
                    targetMeta: { className: 'Variant' },
                  },
                  { name: 'org', kind: 'm:1', primary: true, targetMeta: { className: 'Org' } },
                  {
                    name: 'region',
                    kind: 'm:1',
                    primary: false,
                    targetMeta: { className: 'Region' },
                  },
                ],
              },
            },
          ],
        },
      },
      'v1',
      dbEntity,
    )
    const pojo = {
      id: 'v1',
      variantOrgs: [{ variant: 'v1', org: 'o1', region: 'r1', note: 'hello' }],
    }
    const result = (await svc.changePOJOToEntity('Variant', pojo)) as any
    expect(result.variantOrgs).toEqual([
      { variant: { id: 'v1' }, org: { id: 'o1' }, region: { id: 'r1' }, note: 'hello' },
    ])
  })

  test('1:m to tree entity: item relation fields as strings → restored', async () => {
    const dbEntity = { id: 'c1', ancestors: [], isInitialized: () => true } as any
    const svc = makeServiceWithMeta(
      {
        Category: {
          relations: [
            {
              name: 'ancestors',
              kind: '1:m',
              targetMeta: {
                className: 'CategoryTree',
                relations: [
                  {
                    name: 'ancestor',
                    kind: 'm:1',
                    primary: true,
                    targetMeta: { className: 'Category' },
                  },
                  {
                    name: 'descendant',
                    kind: 'm:1',
                    primary: true,
                    targetMeta: { className: 'Category' },
                  },
                ],
              },
            },
          ],
        },
      },
      'c1',
      dbEntity,
    )
    const pojo = {
      id: 'c1',
      ancestors: [{ ancestor: 'a1', descendant: 'd1', depth: '1' }],
    }
    const result = (await svc.changePOJOToEntity('Category', pojo)) as any
    expect(result.ancestors).toEqual([
      { ancestor: { id: 'a1' }, descendant: { id: 'd1' }, depth: '1' },
    ])
  })

  test('non-relation string values in items → left as-is', async () => {
    const dbEntity = { id: 'v1', variantOrgs: [], isInitialized: () => true } as any
    const svc = makeServiceWithMeta(
      {
        Variant: {
          relations: [
            { name: 'orgs', kind: 'm:n', pivotEntity: 'VariantsOrgs' },
            {
              name: 'variantOrgs',
              kind: '1:m',
              targetMeta: {
                className: 'VariantsOrgs',
                relations: [
                  { name: 'org', kind: 'm:1', primary: true, targetMeta: { className: 'Org' } },
                ],
              },
            },
          ],
        },
      },
      'v1',
      dbEntity,
    )
    const pojo = {
      id: 'v1',
      variantOrgs: [{ org: 'o1', customNote: 'some-text', count: 42 }],
    }
    const result = (await svc.changePOJOToEntity('Variant', pojo)) as any
    expect(result.variantOrgs).toEqual([{ org: { id: 'o1' }, customNote: 'some-text', count: 42 }])
  })

  test('entity fetched from DB and POJO fields applied', async () => {
    const dbEntity = { id: 'v1', name: 'old-name', score: 10, isInitialized: () => true } as any
    const svc = makeServiceWithMeta({ Variant: { relations: [] } }, 'v1', dbEntity)
    const result = (await svc.changePOJOToEntity('Variant', { id: 'v1', name: 'new-name' })) as any
    expect(result.name).toBe('new-name')
    expect(result.score).toBe(10) // DB value preserved for fields not in POJO
  })

  test('entity not found in DB → creates in-memory entity from POJO', async () => {
    class MockVariant {
      id?: string
      name?: string
    }
    const em = {
      getMetadata: () => ({ get: () => ({ relations: [], class: MockVariant }) }),
      create: (EntityClass: any, data: any, _opts: any) => {
        const entity = new EntityClass()
        Object.assign(entity, data)
        return entity
      },
      getReference: (_entity: any, id: string) => ({ id }),
    } as any
    const metaService = {
      findEntityService: () => [null, { findOneByID: async () => null }],
    } as any
    const svc = new EditService(em, {} as any, metaService)
    const result = (await svc.changePOJOToEntity('Variant', {
      id: 'draft-id',
      name: 'Draft',
    })) as any
    expect(result.id).toBe('draft-id')
    expect(result.name).toBe('Draft')
    expect(result).toBeInstanceOf(MockVariant)
  })

  test('no entityID provided → throws NotFoundErr', async () => {
    const em = {
      getMetadata: () => ({ get: () => ({ relations: [] }) }),
      getReference: (_entity: any, id: string) => ({ id }),
    } as any
    const metaService = { findEntityService: () => null } as any
    const svc = new EditService(em, {} as any, metaService)
    await expect(svc.changePOJOToEntity('Variant', { id: 'v1' })).rejects.toThrow()
  })

  test('no entity service found → throws NotFoundErr', async () => {
    const em = {
      getMetadata: () => ({ get: () => ({ relations: [], class: class Variant {} }) }),
      getReference: (_entity: any, id: string) => ({ id }),
    } as any
    const metaService = { findEntityService: () => null } as any
    const svc = new EditService(em, {} as any, metaService)
    await expect(svc.changePOJOToEntity('Variant', { id: 'v1' })).rejects.toThrow()
  })
})
