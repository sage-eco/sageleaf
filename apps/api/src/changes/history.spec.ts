import { MikroORM, wrap } from '@mikro-orm/postgresql'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import { graphql } from '@test/gql'
import { ChangeStatus } from '@test/gql/types.generated'
import { GraphQLTestClient } from '@test/graphql.utils'

import { EditService } from '@src/changes/edit.service'
import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { CATEGORY_IDS, TestCategorySeeder } from '@src/db/seeds/TestCategorySeeder'
import { TestMaterialSeeder } from '@src/db/seeds/TestMaterialSeeder'
import { REGION_IDS, TestProcessSeeder } from '@src/db/seeds/TestProcessSeeder'
import { TestTagSeeder } from '@src/db/seeds/TestTagSeeder'
import { ITEM_IDS, TestVariantSeeder, VARIANT_IDS } from '@src/db/seeds/TestVariantSeeder'
import { UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'
import { ProcessHistory } from '@src/process/process.entity'
import { CategoryHistory } from '@src/product/category.entity'
import { Item } from '@src/product/item.entity'
import { Variant, VariantHistory } from '@src/product/variant.entity'

describe('History via Change/Merge flow (integration)', () => {
  let app: INestApplication
  let gql: GraphQLTestClient
  let orm: MikroORM
  let editService: EditService

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule],
    }).compile()

    app = module.createNestApplication()
    await app.init()

    gql = new GraphQLTestClient(app)

    orm = module.get<MikroORM>(MikroORM)
    editService = module.get<EditService>(EditService)

    await clearDatabase(orm, 'public', ['users'])
    await orm.seeder.seed(
      BaseSeeder,
      UserSeeder,
      TestMaterialSeeder,
      TestCategorySeeder,
      TestProcessSeeder,
      TestTagSeeder,
      TestVariantSeeder,
    )

    await gql.signIn('admin', 'password')
  })

  afterAll(async () => {
    await app.close()
  })

  describe('single Change with multiple entity edits', () => {
    let changeID: string
    let newProcessID: string
    const existingItemID = ITEM_IDS[0]
    const existingVariantID = VARIANT_IDS[0]

    test('should create a Process edit inside a new Change', async () => {
      const res = await gql.send(
        graphql(`
          mutation HistorySpecCreateProcess($input: CreateProcessInput!) {
            createProcess(input: $input) {
              process {
                id
              }
              change {
                id
                status
              }
            }
          }
        `),
        {
          input: {
            name: 'Change-Flow Process',
            intent: 'RECYCLE',
            change: { title: 'Multi-entity change', status: ChangeStatus.Draft },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createProcess?.process).toBeDefined()
      expect(res.data?.createProcess?.change).toBeDefined()
      newProcessID = res.data!.createProcess!.process!.id
      changeID = res.data!.createProcess!.change!.id
    })

    test('should add an Item update to the same Change', async () => {
      const res = await gql.send(
        graphql(`
          mutation HistorySpecUpdateItem($input: UpdateItemInput!) {
            updateItem(input: $input) {
              item {
                id
              }
              change {
                id
              }
            }
          }
        `),
        {
          input: {
            id: existingItemID,
            name: 'Item updated via Change',
            changeID,
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateItem?.item).toBeDefined()
      expect(res.data?.updateItem?.change?.id).toBe(changeID)
    })

    test('should add a Variant update to the same Change', async () => {
      const res = await gql.send(
        graphql(`
          mutation HistorySpecUpdateVariant($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
                id
              }
              change {
                id
              }
            }
          }
        `),
        {
          input: {
            id: existingVariantID,
            name: 'Variant updated via Change',
            changeID,
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateVariant?.variant).toBeDefined()
      expect(res.data?.updateVariant?.change?.id).toBe(changeID)
    })

    test('should approve the Change', async () => {
      const res = await gql.send(
        graphql(`
          mutation HistorySpecApproveChange($input: UpdateChangeInput!) {
            updateChange(input: $input) {
              change {
                id
                status
              }
            }
          }
        `),
        { input: { id: changeID, status: ChangeStatus.Approved } },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateChange?.change?.status).toBe('APPROVED')
    })

    test('should merge the Change', async () => {
      const res = await gql.send(
        graphql(`
          mutation HistorySpecMergeChange($id: ID!) {
            mergeChange(id: $id) {
              change {
                id
                status
              }
            }
          }
        `),
        { id: changeID },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.mergeChange?.change).toBeDefined()
    })

    test('should have history on the new Process after merge', async () => {
      const res = await gql.send(
        graphql(`
          query HistorySpecGetProcess($id: ID!) {
            process(id: $id) {
              id
              history {
                nodes {
                  datetime
                  user {
                    id
                  }
                  original {
                    name
                  }
                  changes {
                    name
                  }
                }
              }
            }
          }
        `),
        { id: newProcessID },
      )
      expect(res.errors).toBeUndefined()
      const history = res.data?.process?.history.nodes
      expect(history).toHaveLength(1)
      expect(history![0].user).toBeDefined()
      expect(history![0].original).toBeNull()
      expect(history![0].changes).toBeTruthy()
    })

    test('should have history on the updated Item after merge', async () => {
      const res = await gql.send(
        graphql(`
          query HistorySpecGetItem($id: ID!) {
            item(id: $id) {
              id
              history {
                nodes {
                  datetime
                  user {
                    id
                  }
                  original {
                    name
                  }
                  changes {
                    name
                  }
                }
              }
            }
          }
        `),
        { id: existingItemID },
      )
      expect(res.errors).toBeUndefined()
      const history = res.data?.item?.history.nodes
      expect(history!.length).toBeGreaterThanOrEqual(1)
      const latest = history!.at(-1)!
      expect(latest.user).toBeDefined()
      expect(latest.original).toBeTruthy()
      expect(latest.changes).toBeTruthy()
      expect(latest.original?.name).not.toBe('Item updated via Change')
      expect(latest.changes?.name).toBe('Item updated via Change')
    })

    test('should have history on the updated Variant after merge', async () => {
      const res = await gql.send(
        graphql(`
          query HistorySpecGetVariant($id: ID!) {
            variant(id: $id) {
              id
              history {
                nodes {
                  datetime
                  user {
                    id
                  }
                  original {
                    name
                  }
                  changes {
                    name
                  }
                }
              }
            }
          }
        `),
        { id: existingVariantID },
      )
      expect(res.errors).toBeUndefined()
      const history = res.data?.variant?.history.nodes
      expect(history!.length).toBeGreaterThanOrEqual(1)
      const latest = history!.at(-1)!
      expect(latest.user).toBeDefined()
      expect(latest.original).toBeTruthy()
      expect(latest.changes).toBeTruthy()
      expect(latest.original?.name).not.toBe('Variant updated via Change')
      expect(latest.changes?.name).toBe('Variant updated via Change')
    })
  })

  describe('entityToChangePOJO POJO structure', () => {
    const variantID = VARIANT_IDS[1]
    const categoryID = CATEGORY_IDS[0] // 'packaging' — has parents (edge to root) and ancestors

    // --- Scenario A: Variant.region (m:1 non-primary) stored as string ID ---

    let variantChangeID: string

    test('A: create a change to update Variant with region', async () => {
      const res = await gql.send(
        graphql(`
          mutation POJOSpecUpdateVariantRegion($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
                id
              }
              change {
                id
              }
            }
          }
        `),
        {
          input: {
            id: variantID,
            name: 'POJO Variant',
            region: { id: REGION_IDS[0] },
            change: { title: 'POJO region test', status: ChangeStatus.Draft },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      variantChangeID = res.data!.updateVariant!.change!.id
    })

    test('A: approve and merge the Variant change', async () => {
      await gql.send(
        graphql(`
          mutation POJOSpecApproveVariant($input: UpdateChangeInput!) {
            updateChange(input: $input) {
              change {
                id
              }
            }
          }
        `),
        { input: { id: variantChangeID, status: ChangeStatus.Approved } },
      )
      const mergeRes = await gql.send(
        graphql(`
          mutation POJOSpecMergeVariant($id: ID!) {
            mergeChange(id: $id) {
              change {
                id
              }
            }
          }
        `),
        { id: variantChangeID },
      )
      expect(mergeRes.errors).toBeUndefined()
    })

    test('A: Variant history POJO — region is string ID, owning m:n (orgs) excluded', async () => {
      const em = orm.em.fork()
      const history = await em.findOne(
        VariantHistory,
        { variant: variantID },
        { orderBy: { datetime: 'DESC' } },
      )
      expect(history).toBeDefined()
      const pojo = history!.changes as any
      // m:1 non-primary stored as string ID, not object
      expect(typeof pojo.region).toBe('string')
      expect(pojo.region).toBe(REGION_IDS[0])
      // owning M:N excluded from POJO
      expect(pojo).not.toHaveProperty('orgs')
      // createdAt/updatedAt excluded
      expect(pojo).not.toHaveProperty('createdAt')
      expect(pojo).not.toHaveProperty('updatedAt')
    })

    // --- Scenario C: Category scalar fields correct, inverse M:N excluded ---

    let categoryChangeID: string

    test('C: create a change to update Category', async () => {
      const res = await gql.send(
        graphql(`
          mutation POJOSpecUpdateCategory($input: UpdateCategoryInput!) {
            updateCategory(input: $input) {
              category {
                id
              }
              change {
                id
              }
            }
          }
        `),
        {
          input: {
            id: categoryID,
            name: 'Packaging Updated',
            change: { title: 'POJO category test', status: ChangeStatus.Draft },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      categoryChangeID = res.data!.updateCategory!.change!.id
    })

    test('C: approve and merge the Category change', async () => {
      await gql.send(
        graphql(`
          mutation POJOSpecApproveCategory($input: UpdateChangeInput!) {
            updateChange(input: $input) {
              change {
                id
              }
            }
          }
        `),
        { input: { id: categoryChangeID, status: ChangeStatus.Approved } },
      )
      const mergeRes = await gql.send(
        graphql(`
          mutation POJOSpecMergeCategory($id: ID!) {
            mergeChange(id: $id) {
              change {
                id
              }
            }
          }
        `),
        { id: categoryChangeID },
      )
      expect(mergeRes.errors).toBeUndefined()
    })

    test('C: Category history POJO — scalar fields present, relations excluded or absent', async () => {
      const em = orm.em.fork()
      const history = await em.findOne(
        CategoryHistory,
        { category: categoryID },
        { orderBy: { datetime: 'DESC' } },
      )
      expect(history).toBeDefined()
      const pojo = history!.changes as any
      // scalar field is present
      expect(pojo.name).toBeDefined()
      // inverse M:N (items) — not in POJO
      expect(pojo).not.toHaveProperty('items')
      // history relation — not in POJO
      expect(pojo).not.toHaveProperty('history')
      // createdAt/updatedAt stripped
      expect(pojo).not.toHaveProperty('createdAt')
      expect(pojo).not.toHaveProperty('updatedAt')
    })

    // --- Scenario D: Process m:1 relations stored as null or string ID (never object) ---

    test('D: Process history POJO — m:1 fields are null or string, never object', async () => {
      // The sibling describe block already creates and merges a Process; use that record.
      const em = orm.em.fork()
      const records = await em.find(ProcessHistory, {}, { orderBy: { datetime: 'DESC' }, limit: 1 })
      expect(records.length).toBeGreaterThanOrEqual(1)
      const pojo = records[0].changes as any
      // Each m:1 field must be null/undefined or a plain string ID — never a nested object
      for (const field of ['material', 'variant', 'org', 'region', 'place'] as const) {
        const val = pojo[field]
        if (val !== null && val !== undefined) {
          expect(typeof val, `field "${field}" should be string, got ${JSON.stringify(val)}`).toBe(
            'string',
          )
        }
      }
    })

    // --- Scenario E: @ExcludeFromDiff() omits rank/rankOrder from the diff POJO ---

    test('E: entityToChangePOJO omits rank and rankOrder', async () => {
      const em = orm.em.fork()
      const variant = await em.findOneOrFail(Variant, variantID)
      wrap(variant).assign({ rank: { order: 5 } })
      const pojo = editService.entityToChangePOJO(Variant, variant as any) as any
      expect(pojo).not.toHaveProperty('rank')
      expect(pojo).not.toHaveProperty('rankOrder')
    })
  })

  describe('Item created in change, Variant updated to reference it, then merged', () => {
    let changeID: string
    let newItemID: string
    const existingVariantID = VARIANT_IDS[0]

    test('should create an Item within a new Change', async () => {
      const res = await gql.send(
        graphql(`
          mutation CrossRefCreateItem($input: CreateItemInput!) {
            createItem(input: $input) {
              item {
                id
              }
              change {
                id
              }
            }
          }
        `),
        {
          input: {
            nameTr: [{ lang: 'en', text: 'Cross-ref Item', auto: false }],
            change: { title: 'Cross-entity ref change' },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createItem?.item).toBeDefined()
      expect(res.data?.createItem?.change).toBeDefined()
      newItemID = res.data!.createItem!.item!.id
      changeID = res.data!.createItem!.change!.id
    })

    test('should update the Variant to reference the new Item within the same Change', async () => {
      const res = await gql.send(
        graphql(`
          mutation CrossRefUpdateVariant($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
                id
              }
              change {
                id
              }
            }
          }
        `),
        {
          input: {
            id: existingVariantID,
            addItems: [{ id: newItemID }],
            changeID,
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateVariant?.variant).toBeDefined()
      expect(res.data?.updateVariant?.change?.id).toBe(changeID)
    })

    test('should approve the Change', async () => {
      const res = await gql.send(
        graphql(`
          mutation CrossRefApprove($input: UpdateChangeInput!) {
            updateChange(input: $input) {
              change {
                id
                status
              }
            }
          }
        `),
        { input: { id: changeID, status: ChangeStatus.Approved } },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateChange?.change?.status).toBe('APPROVED')
    })

    test('should merge the Change', async () => {
      const res = await gql.send(
        graphql(`
          mutation CrossRefMerge($id: ID!) {
            mergeChange(id: $id) {
              change {
                id
                status
              }
            }
          }
        `),
        { id: changeID },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.mergeChange?.change).toBeDefined()
    })

    test('should have the new Item in the database after merge', async () => {
      const em = orm.em.fork()
      const item = await em.findOne(Item, { id: newItemID })
      expect(item).toBeDefined()
      expect(item!.id).toBe(newItemID)
    })

    test('should have the new Item linked to the Variant after merge', async () => {
      const em = orm.em.fork()
      const variant = await em.findOne(Variant, { id: existingVariantID }, { populate: ['items'] })
      expect(variant).toBeDefined()
      const itemIDs = variant!.items.getItems().map((i) => i.id)
      expect(itemIDs).toContain(newItemID)
    })
  })
})
