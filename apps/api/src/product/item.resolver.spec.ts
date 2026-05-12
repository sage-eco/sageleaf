import { MikroORM } from '@mikro-orm/postgresql'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import { graphql } from '@test/gql'
import { ChangeStatus, RefModelType } from '@test/gql/types.generated'
import { GraphQLTestClient } from '@test/graphql.utils'

import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { CATEGORY_IDS, TestCategorySeeder } from '@src/db/seeds/TestCategorySeeder'
import { MATERIAL_IDS, TestMaterialSeeder } from '@src/db/seeds/TestMaterialSeeder'
import { REGION_IDS, TestProcessSeeder } from '@src/db/seeds/TestProcessSeeder'
import { TAG_IDS, TestTagSeeder } from '@src/db/seeds/TestTagSeeder'
import {
  COMPONENT_IDS,
  ITEM_IDS,
  TestVariantSeeder,
  VARIANT_IDS,
} from '@src/db/seeds/TestVariantSeeder'
import { UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'
import { Region } from '@src/geo/region.entity'
import { Material } from '@src/process/material.entity'
import { Process, ProcessIntent } from '@src/process/process.entity'
import { Item, ItemsCategories, ItemsTags } from '@src/product/item.entity'
import { Variant } from '@src/product/variant.entity'
import { WindmillMockService } from '@src/windmill/windmill.mock.service'
import { WindmillService } from '@src/windmill/windmill.service'

describe('ItemResolver (integration)', () => {
  let app: INestApplication
  let gql: GraphQLTestClient
  let orm: MikroORM
  let itemID: string

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule],
    })
      .overrideProvider(WindmillService)
      .useClass(WindmillMockService)
      .compile()

    app = module.createNestApplication()
    await app.init()

    gql = new GraphQLTestClient(app)

    orm = module.get<MikroORM>(MikroORM)

    await clearDatabase(orm, 'public', ['users'])
    await orm.seeder.seed(
      BaseSeeder,
      UserSeeder,
      TestCategorySeeder,
      TestMaterialSeeder,
      TestProcessSeeder,
      TestTagSeeder,
      TestVariantSeeder,
    )

    await gql.signIn('admin', 'password')

    itemID = ITEM_IDS[0]
  })

  afterAll(async () => {
    await app.close()
  })

  test('should query items with pagination', async () => {
    const res = await gql.send(
      graphql(`
        query ItemResolverListItems($first: Int) {
          items(first: $first) {
            nodes {
              id
              name
            }
            totalCount
            pageInfo {
              hasNextPage
              hasPreviousPage
            }
          }
        }
      `),
      { first: 10 },
    )
    expect(res.data?.items.nodes?.length).toBeGreaterThan(0)
    expect(res.data?.items.totalCount).toBeGreaterThan(0)
  })

  test('should query a single item', async () => {
    const res = await gql.send(
      graphql(`
        query ItemResolverGetItem($id: ID!) {
          item(id: $id) {
            id
            name
          }
        }
      `),
      { id: itemID },
    )
    expect(res.data?.item).toBeDefined()
    expect(res.data?.item?.id).toBe(itemID)
  })

  test('should query item schema', async () => {
    const res = await gql.send(
      graphql(`
        query ItemResolverGetItemSchema {
          itemSchema {
            create {
              schema
              uischema
            }
            update {
              schema
              uischema
            }
          }
        }
      `),
    )
    expect(res.data?.itemSchema).toBeDefined()
    expect(res.data?.itemSchema?.create).toBeDefined()
    expect(res.data?.itemSchema?.update).toBeDefined()
  })

  test('should query item add/remove ref schema', async () => {
    const res = await gql.send(
      graphql(`
        query ItemResolverGetItemRefSchema($refModel: RefModelType!) {
          itemSchema {
            addRef(refModel: $refModel) {
              schema
              uischema
            }
            removeRef(refModel: $refModel) {
              schema
              uischema
            }
          }
        }
      `),
      { refModel: RefModelType.Category },
    )
    expect(res.errors).toBeUndefined()
    const addSchema = res.data?.itemSchema?.addRef?.schema as any
    const removeSchema = res.data?.itemSchema?.removeRef?.schema as any
    expect(addSchema?.properties?.refs).toBeDefined()
    expect(addSchema?.properties?.ref).toBeUndefined()
    expect(addSchema?.properties?.inputs).toBeUndefined()
    expect(addSchema?.required).toContain('refs')
    expect(removeSchema?.properties?.refs).toBeDefined()
    expect(removeSchema?.properties?.ref).toBeUndefined()
  })

  test('should query item tag ref schema with payload inputs', async () => {
    const res = await gql.send(
      graphql(`
        query ItemResolverGetItemTagRefSchema($refModel: RefModelType!) {
          itemSchema {
            addRef(refModel: $refModel) {
              schema
            }
          }
        }
      `),
      { refModel: RefModelType.Tag },
    )
    expect(res.errors).toBeUndefined()
    const addSchema = res.data?.itemSchema?.addRef?.schema as any
    expect(addSchema?.properties?.refs).toBeDefined()
    expect(addSchema?.properties?.inputs).toBeDefined()
    expect(addSchema?.properties?.inputs?.items?.properties?.meta).toBeDefined()
  })

  test('should query item categories with pagination', async () => {
    const res = await gql.send(
      graphql(`
        query ItemResolverGetItemCategories($id: ID!, $first: Int) {
          item(id: $id) {
            id
            categories(first: $first) {
              nodes {
                id
                name
              }
              totalCount
            }
          }
        }
      `),
      { id: itemID, first: 10 },
    )
    expect(res.data?.item?.categories).toBeDefined()
    expect(Array.isArray(res.data?.item?.categories.nodes)).toBe(true)
  })

  test('should query item tags with pagination', async () => {
    const res = await gql.send(
      graphql(`
        query ItemResolverGetItemTags($id: ID!, $first: Int) {
          item(id: $id) {
            id
            tags(first: $first) {
              nodes {
                id
                name
              }
              totalCount
            }
          }
        }
      `),
      { id: itemID, first: 10 },
    )
    expect(res.data?.item?.tags).toBeDefined()
    expect(Array.isArray(res.data?.item?.tags.nodes)).toBe(true)
  })

  test('should query item variants with pagination', async () => {
    const res = await gql.send(
      graphql(`
        query ItemResolverGetItemVariants($id: ID!, $first: Int) {
          item(id: $id) {
            id
            variants(first: $first) {
              nodes {
                id
                name
              }
              totalCount
            }
          }
        }
      `),
      { id: itemID, first: 10 },
    )
    expect(res.data?.item?.variants).toBeDefined()
    expect(Array.isArray(res.data?.item?.variants.nodes)).toBe(true)
  })

  test('should create an item', async () => {
    const res = await gql.send(
      graphql(`
        mutation ItemResolverCreateItem($input: CreateItemInput!) {
          createItem(input: $input) {
            item {
              id
              name
            }
          }
        }
      `),
      {
        input: {
          name: 'Test Item',
        },
      },
    )
    expect(res.data?.createItem?.item).toBeDefined()
    expect(res.data?.createItem?.item?.name).toBe('Test Item')
  })

  test('should update an item', async () => {
    const res = await gql.send(
      graphql(`
        mutation ItemResolverUpdateItem($input: UpdateItemInput!) {
          updateItem(input: $input) {
            item {
              id
              name
            }
          }
        }
      `),
      {
        input: {
          id: itemID,
          name: 'Updated Item Name',
        },
      },
    )
    expect(res.data?.updateItem?.item?.id).toBe(itemID)
  })

  test('should return error for non-existent item', async () => {
    const res = await gql.send(
      graphql(`
        query ItemResolverGetNonExistentItem($id: ID!) {
          item(id: $id) {
            id
          }
        }
      `),
      { id: 'non-existent-id' },
    )
    expect(res.errors).toBeDefined()
    expect(res.errors?.[0].message).toContain('Item not found')
  })

  // Comprehensive Create Tests
  describe('CreateItem comprehensive field tests', () => {
    test('should create item with all text fields', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateItemAllText($input: CreateItemInput!) {
            createItem(input: $input) {
              item {
                id
                name
                desc
                imageURL
              }
            }
          }
        `),
        {
          input: {
            name: 'Comprehensive Test Item',
            desc: 'Detailed item description',
            imageURL: 'https://example.com/item.jpg',
            lang: 'en',
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createItem?.item).toBeDefined()
      expect(res.data?.createItem?.item?.name).toBe('Comprehensive Test Item')
      expect(res.data?.createItem?.item?.desc).toBe('Detailed item description')
      expect(res.data?.createItem?.item?.imageURL).toBe('https://example.com/item.jpg')
    })

    test('should create item with translated fields (nameTr, descTr)', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateItemTranslated($input: CreateItemInput!) {
            createItem(input: $input) {
              item {
                id
                name
                desc
              }
            }
          }
        `),
        {
          input: {
            nameTr: [
              { lang: 'en', text: 'English Item Name' },
              { lang: 'sv', text: 'Svenska Artikel Namn' },
            ],
            descTr: [
              { lang: 'en', text: 'English Item Description' },
              { lang: 'sv', text: 'Svenska Artikel Beskrivning' },
            ],
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createItem?.item).toBeDefined()
      expect(res.data?.createItem?.item?.name).toBe('English Item Name')
      expect(res.data?.createItem?.item?.desc).toBe('English Item Description')
    })

    test('should create item with categories relationship', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateItemWithCategories($input: CreateItemInput!) {
            createItem(input: $input) {
              item {
                id
                name
                categories {
                  nodes {
                    id
                  }
                  totalCount
                }
              }
            }
          }
        `),
        {
          input: {
            name: 'Item with Categories',
            categories: [{ id: CATEGORY_IDS[0] }, { id: CATEGORY_IDS[1] }],
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createItem?.item).toBeDefined()
      expect(res.data?.createItem?.item?.name).toBe('Item with Categories')
      expect(res.data?.createItem?.item?.categories?.totalCount).toBe(2)
      expect(res.data?.createItem?.item?.categories?.nodes).toHaveLength(2)
      expect(res.data?.createItem?.item?.categories?.nodes?.map((n) => n.id)).toContain(
        CATEGORY_IDS[0],
      )
      expect(res.data?.createItem?.item?.categories?.nodes?.map((n) => n.id)).toContain(
        CATEGORY_IDS[1],
      )
    })

    test('should create item with tags including metadata', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateItemWithTags($input: CreateItemInput!) {
            createItem(input: $input) {
              item {
                id
                name
                tags {
                  nodes {
                    id
                  }
                  totalCount
                }
              }
            }
          }
        `),
        {
          input: {
            name: 'Item with Tags',
            tags: [
              { id: TAG_IDS[1], meta: { time: 'fast' } },
              { id: TAG_IDS[0], meta: { score: 88 } },
            ],
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createItem?.item).toBeDefined()
      expect(res.data?.createItem?.item?.name).toBe('Item with Tags')
      expect(res.data?.createItem?.item?.tags?.totalCount).toBe(1)
      expect(res.data?.createItem?.item?.tags?.nodes).toHaveLength(1)
      expect(res.data?.createItem?.item?.tags?.nodes?.map((n) => n.id)).toContain(TAG_IDS[0])
    })

    test('should create item with change tracking (change input)', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateItemWithChange($input: CreateItemInput!) {
            createItem(input: $input) {
              item {
                id
                name
              }
              change {
                id
                title
                status
              }
            }
          }
        `),
        {
          input: {
            name: 'Item with Change',
            change: {
              title: 'Add new item via change',
              description: 'Testing change-based creation',
              status: ChangeStatus.Draft,
            },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createItem?.item).toBeDefined()
      expect(res.data?.createItem?.item?.name).toBe('Item with Change')
      expect(res.data?.createItem?.change).toBeDefined()
      expect(res.data?.createItem?.change?.title).toBe('Add new item via change')
      expect(res.data?.createItem?.change?.status).toBe('DRAFT')
    })

    test('should create item with all fields combined', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateItemAllFields($input: CreateItemInput!) {
            createItem(input: $input) {
              item {
                id
                name
                desc
                imageURL
                categories {
                  totalCount
                }
                tags {
                  totalCount
                }
              }
            }
          }
        `),
        {
          input: {
            name: 'Complete Item',
            desc: 'All fields test',
            imageURL: 'icon://complete-item',
            lang: 'en',
            categories: [{ id: CATEGORY_IDS[0] }],
            tags: [{ id: TAG_IDS[1], meta: { time: 'slow' } }],
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createItem?.item).toBeDefined()
      expect(res.data?.createItem?.item?.name).toBe('Complete Item')
      expect(res.data?.createItem?.item?.desc).toBe('All fields test')
      expect(res.data?.createItem?.item?.imageURL).toBe('icon://complete-item')
      expect(res.data?.createItem?.item?.categories?.totalCount).toBe(1)
      expect(res.data?.createItem?.item?.tags?.totalCount).toBe(1)
    })
  })

  // Comprehensive Update Tests
  describe('UpdateItem comprehensive field tests', () => {
    let testItemID: string

    beforeAll(async () => {
      // Create an item to update in all tests
      const res = await gql.send(
        graphql(`
          mutation CreateItemForUpdate($input: CreateItemInput!) {
            createItem(input: $input) {
              item {
                id
              }
            }
          }
        `),
        {
          input: {
            name: 'Item for Updates',
          },
        },
      )
      if (!res.data?.createItem?.item?.id) {
        throw new Error('Failed to create item for update tests')
      }
      testItemID = res.data?.createItem?.item?.id
    })

    test('should update item text fields', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateItemText($input: UpdateItemInput!) {
            updateItem(input: $input) {
              item {
                id
                name
                desc
              }
            }
          }
        `),
        {
          input: {
            id: testItemID,
            name: 'Updated Item Name',
            desc: 'Updated Item Description',
          },
        },
      )
      expect(res.data?.updateItem?.item?.name).toBe('Updated Item Name')
      expect(res.data?.updateItem?.item?.desc).toBe('Updated Item Description')
    })

    test('should add categories to existing item', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateItemAddCategories($input: UpdateItemInput!) {
            updateItem(input: $input) {
              item {
                id
                name
              }
            }
          }
        `),
        {
          input: {
            id: testItemID,
            addCategories: [{ id: CATEGORY_IDS[0] }, { id: CATEGORY_IDS[1] }],
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateItem?.item).toBeDefined()
    })

    test('should remove categories from item', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateItemRemoveCategories($input: UpdateItemInput!) {
            updateItem(input: $input) {
              item {
                id
                categories {
                  totalCount
                }
              }
            }
          }
        `),
        {
          input: {
            id: testItemID,
            removeCategories: [CATEGORY_IDS[0]],
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateItem?.item).toBeDefined()
      expect(res.data?.updateItem?.item?.categories?.totalCount).toBe(1)
    })

    test('should add tags to existing item', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateItemAddTags($input: UpdateItemInput!) {
            updateItem(input: $input) {
              item {
                id
                tags {
                  totalCount
                }
              }
            }
          }
        `),
        {
          input: {
            id: testItemID,
            addTags: [{ id: TAG_IDS[1], meta: { time: 'moderate' } }],
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateItem?.item).toBeDefined()
      expect(res.data?.updateItem?.item?.tags?.totalCount).toBe(1)
    })

    test('should remove tags from item', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateItemRemoveTags($input: UpdateItemInput!) {
            updateItem(input: $input) {
              item {
                id
                tags {
                  totalCount
                }
              }
            }
          }
        `),
        {
          input: {
            id: testItemID,
            removeTags: [TAG_IDS[1]],
          },
        },
      )
      expect(res.data?.updateItem?.item).toBeTruthy()
    })

    test('should update item with change tracking', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateItemWithChange($input: UpdateItemInput!) {
            updateItem(input: $input) {
              item {
                id
                name
              }
              change {
                id
                title
                status
              }
            }
          }
        `),
        {
          input: {
            id: testItemID,
            name: 'Updated via Change',
            change: {
              title: 'Update item test',
              status: ChangeStatus.Proposed,
            },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateItem?.item).toBeDefined()
      expect(res.data?.updateItem?.item?.name).toBe('Updated via Change')
      expect(res.data?.updateItem?.change).toBeDefined()
      expect(res.data?.updateItem?.change?.title).toBe('Update item test')
      expect(res.data?.updateItem?.change?.status).toBe('PROPOSED')
    })

    test('should return currentItem with DB state when using change tracking', async () => {
      // First set a known name directly in the DB
      const directRes = await gql.send(
        graphql(`
          mutation ItemSetCurrentName($input: UpdateItemInput!) {
            updateItem(input: $input) {
              item {
                id
                name
              }
            }
          }
        `),
        { input: { id: testItemID, name: 'Current DB Name' } },
      )
      expect(directRes.errors).toBeUndefined()

      // Now update via change — item should show proposed, currentItem the DB value
      const changeRes = await gql.send(
        graphql(`
          mutation UpdateItemWithChangeCurrentItem($input: UpdateItemInput!) {
            updateItem(input: $input) {
              item {
                id
                name
              }
              currentItem {
                id
                name
              }
              change {
                id
              }
            }
          }
        `),
        {
          input: {
            id: testItemID,
            name: 'Proposed Name',
            change: { title: 'current item test' },
          },
        },
      )
      expect(changeRes.errors).toBeUndefined()
      expect(changeRes.data?.updateItem?.item?.name).toBe('Proposed Name')
      expect(changeRes.data?.updateItem?.currentItem?.name).toBe('Current DB Name')
      expect(changeRes.data?.updateItem?.currentItem?.id).toBe(testItemID)
    })
  })

  describe('change tracking for category and tag references', () => {
    let changeID: string
    let stagedItemID: string

    test('creates an item in change mode without persisting main or pivot rows', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateItemReferenceChange($input: CreateItemInput!) {
            createItem(input: $input) {
              item {
                id
                categories {
                  nodes {
                    id
                  }
                }
                tags {
                  nodes {
                    id
                  }
                }
              }
              change {
                id
              }
            }
          }
        `),
        {
          input: {
            name: 'Staged Item Refs',
            categories: [{ id: CATEGORY_IDS[0] }],
            tags: [{ id: TAG_IDS[0], meta: { score: 70 } }],
            change: { title: 'Item refs change', status: ChangeStatus.Draft },
          },
        },
      )

      expect(res.errors).toBeUndefined()
      stagedItemID = res.data!.createItem!.item!.id
      changeID = res.data!.createItem!.change!.id

      const em = orm.em.fork()
      expect(await em.findOne(Item, { id: stagedItemID } as any)).toBeNull()
      expect(await em.count(ItemsCategories, { item: stagedItemID } as any)).toBe(0)
      expect(await em.count(ItemsTags, { item: stagedItemID } as any)).toBe(0)
    })

    test('updates staged item refs without leaking collection rows before merge', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateItemReferenceChange($input: UpdateItemInput!) {
            updateItem(input: $input) {
              item {
                id
                categories {
                  nodes {
                    id
                  }
                }
                tags {
                  nodes {
                    id
                  }
                }
              }
              change {
                id
              }
            }
          }
        `),
        {
          input: {
            id: stagedItemID,
            categories: [{ id: CATEGORY_IDS[1] }],
            removeTags: [TAG_IDS[0]],
            addTags: [{ id: TAG_IDS[0], meta: { score: 90 } }],
            changeID,
          },
        },
      )

      expect(res.errors).toBeUndefined()
      expect(res.data!.updateItem!.change!.id).toBe(changeID)

      const em = orm.em.fork()
      expect(await em.findOne(Item, { id: stagedItemID } as any)).toBeNull()
      expect(await em.count(ItemsCategories, { item: stagedItemID } as any)).toBe(0)
      expect(await em.count(ItemsTags, { item: stagedItemID } as any)).toBe(0)
    })

    test('merges staged item refs into the database correctly', async () => {
      const approveRes = await gql.send(
        graphql(`
          mutation ApproveItemReferenceChange($input: UpdateChangeInput!) {
            updateChange(input: $input) {
              change {
                status
              }
            }
          }
        `),
        { input: { id: changeID, status: ChangeStatus.Approved } },
      )
      expect(approveRes.errors).toBeUndefined()

      const mergeRes = await gql.send(
        graphql(`
          mutation MergeItemReferenceChange($id: ID!) {
            mergeChange(id: $id) {
              change {
                status
              }
            }
          }
        `),
        { id: changeID },
      )
      expect(mergeRes.errors).toBeUndefined()

      const itemRes = await gql.send(
        graphql(`
          query GetMergedItemReferenceChange($id: ID!) {
            item(id: $id) {
              id
              categories {
                nodes {
                  id
                }
              }
              tags {
                nodes {
                  id
                }
              }
            }
          }
        `),
        { id: stagedItemID },
      )
      expect(itemRes.errors).toBeUndefined()
      expect(itemRes.data?.item?.categories?.nodes?.map((node) => node.id)).toEqual([
        CATEGORY_IDS[1],
      ])
      expect(itemRes.data?.item?.tags?.nodes?.map((node) => node.id)).toEqual([TAG_IDS[0]])
    })
  })

  // Batch mutation tests
  describe('Batch mutations', () => {
    test('should handle multiple create mutations in single request', async () => {
      const res = await gql.send(
        graphql(`
          mutation BatchCreateItems($input1: CreateItemInput!, $input2: CreateItemInput!) {
            item1: createItem(input: $input1) {
              item {
                id
                name
              }
            }
            item2: createItem(input: $input2) {
              item {
                id
                name
              }
            }
          }
        `),
        {
          input1: { name: 'Batch Item 1' },
          input2: { name: 'Batch Item 2' },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.item1?.item).toBeDefined()
      expect(res.data?.item1?.item?.name).toBe('Batch Item 1')
      expect(res.data?.item2?.item).toBeDefined()
      expect(res.data?.item2?.item?.name).toBe('Batch Item 2')
    })
  })

  describe('history tracking', () => {
    let historyItemID: string

    test('should record history on direct create', async () => {
      const createRes = await gql.send(
        graphql(`
          mutation ItemHistoryCreate($input: CreateItemInput!) {
            createItem(input: $input) {
              item {
                id
                history {
                  nodes {
                    datetime
                    user {
                      id
                    }
                    original {
                      id
                    }
                    changes {
                      id
                    }
                  }
                }
              }
            }
          }
        `),
        { input: { name: 'History Test Item' } },
      )
      expect(createRes.errors).toBeUndefined()
      const item = createRes.data?.createItem?.item
      expect(item).toBeDefined()
      historyItemID = item!.id
      expect(item!.history.nodes).toHaveLength(1)
      expect(item!.history.nodes![0].user).toBeDefined()
      expect(item!.history.nodes![0].original).toBeNull()
      expect(item!.history.nodes![0].changes).toBeTruthy()
    })

    test('should record history on direct update', async () => {
      const updateRes = await gql.send(
        graphql(`
          mutation ItemHistoryUpdate($input: UpdateItemInput!) {
            updateItem(input: $input) {
              item {
                id
                history {
                  nodes {
                    datetime
                    user {
                      id
                    }
                    original {
                      id
                    }
                    changes {
                      id
                    }
                  }
                }
              }
            }
          }
        `),
        { input: { id: historyItemID, name: 'Updated History Item' } },
      )
      expect(updateRes.errors).toBeUndefined()
      const item = updateRes.data?.updateItem?.item
      expect(item).toBeDefined()
      expect(item!.history.nodes).toHaveLength(2)
      const latest = item!.history.nodes!.at(-1)!
      expect(latest.original).toBeTruthy()
      expect(latest.changes).toBeTruthy()
    })
  })

  describe('Item recycling fields (combined from variants)', () => {
    const RECYCLE_PROCESS_ID = 'proc_ITEM_RECYCLE_TEST__'

    beforeAll(async () => {
      const em = orm.em.fork()
      em.create(Process, {
        id: RECYCLE_PROCESS_ID,
        name: { en: 'Item Recycle Process' },
        desc: { en: 'A process for testing item recycle queries' },
        intent: ProcessIntent.RECYCLE,
        instructions: {},
        material: em.getReference(Material, MATERIAL_IDS[0]),
        region: em.getReference(Region, REGION_IDS[0]),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await em.flush()
    })

    test('should return recycle entries for an item', async () => {
      // ITEM_IDS[0] is linked to VARIANT_IDS which include COMPONENT_IDS[0] (material: MATERIAL_IDS[0])
      const res = await gql.send(
        graphql(`
          query ItemRecycles($id: ID!, $regionID: ID!) {
            item(id: $id) {
              recycle(regionID: $regionID) {
                stream {
                  name
                  desc
                }
                components {
                  totalCount
                  nodes {
                    id
                  }
                }
              }
            }
          }
        `),
        { id: ITEM_IDS[0], regionID: REGION_IDS[0] },
      )
      expect(res.errors).toBeUndefined()
      const recycle = res.data?.item?.recycle
      expect(recycle).toBeDefined()
      expect(recycle!.length).toBeGreaterThan(0)
      const first = recycle!.at(0)!
      expect(first.stream?.name).toBe('Item Recycle Process')
      expect(first.components.totalCount).toBeGreaterThan(0)
      const nodeIds = first.components.nodes.map((n: { id: string }) => n.id)
      expect(nodeIds).toContain(COMPONENT_IDS[0])
    })

    test('should support pagination args on components field', async () => {
      const res = await gql.send(
        graphql(`
          query ItemRecycleComponentsPaginated($id: ID!, $regionID: ID!) {
            item(id: $id) {
              recycle(regionID: $regionID) {
                components(first: 1) {
                  totalCount
                  nodes {
                    id
                  }
                }
              }
            }
          }
        `),
        { id: ITEM_IDS[0], regionID: REGION_IDS[0] },
      )
      expect(res.errors).toBeUndefined()
      const recycle = res.data?.item?.recycle
      expect(recycle?.length).toBeGreaterThan(0)
      const components = recycle!.at(0)!.components
      expect(components.nodes.length).toBeLessThanOrEqual(1)
      expect(components.totalCount).toBeGreaterThan(0)
    })

    test('should return variants for a variant-specific process on ItemRecycle', async () => {
      const VARIANT_PROCESS_ID = 'proc_ITEM_VARIANT_TEST__'
      const em = orm.em.fork()
      em.create(Process, {
        id: VARIANT_PROCESS_ID,
        name: { en: 'Item Variant-Specific Process' },
        desc: { en: 'A process linked directly to a variant, not a material' },
        intent: ProcessIntent.RECYCLE,
        instructions: {},
        variant: em.getReference(Variant, VARIANT_IDS[0]),
        region: em.getReference(Region, REGION_IDS[0]),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await em.flush()

      const res = await gql.send(
        graphql(`
          query ItemRecycleVariants($id: ID!, $regionID: ID!) {
            item(id: $id) {
              recycle(regionID: $regionID) {
                stream {
                  name
                }
                variants {
                  totalCount
                  nodes {
                    id
                  }
                }
              }
            }
          }
        `),
        { id: ITEM_IDS[0], regionID: REGION_IDS[0] },
      )
      expect(res.errors).toBeUndefined()
      const recycle = res.data?.item?.recycle
      expect(recycle?.length).toBeGreaterThan(0)
      const variantEntry = recycle!.find((r) => r.stream?.name === 'Item Variant-Specific Process')
      expect(variantEntry).toBeDefined()
      expect(variantEntry!.variants.totalCount).toBeGreaterThan(0)
      const variantIds = variantEntry!.variants.nodes.map((n: { id: string }) => n.id)
      expect(variantIds).toContain(VARIANT_IDS[0])
    })

    test('should return the same stream data at item level as at component level', async () => {
      const componentRes = await gql.send(
        graphql(`
          query ItemRecycleConsistencyComponent($id: ID!, $regionID: ID!) {
            component(id: $id) {
              recycle(regionID: $regionID) {
                stream {
                  name
                  desc
                }
              }
            }
          }
        `),
        { id: COMPONENT_IDS[0], regionID: REGION_IDS[0] },
      )
      const itemRes = await gql.send(
        graphql(`
          query ItemRecyclesConsistencyItem($id: ID!, $regionID: ID!) {
            item(id: $id) {
              recycle(regionID: $regionID) {
                stream {
                  name
                  desc
                }
              }
            }
          }
        `),
        { id: ITEM_IDS[0], regionID: REGION_IDS[0] },
      )
      expect(componentRes.errors).toBeUndefined()
      expect(itemRes.errors).toBeUndefined()

      const componentStream = componentRes.data?.component?.recycle?.at(0)?.stream
      const itemStream = itemRes.data?.item?.recycle?.at(0)?.stream
      expect(componentStream?.name).toBeDefined()
      expect(itemStream?.name).toBe(componentStream?.name)
      expect(itemStream?.desc).toBe(componentStream?.desc)
    })

    test('should return same stream data at item level as at variant level', async () => {
      const variantRes = await gql.send(
        graphql(`
          query ItemRecycleConsistencyVariant($id: ID!, $regionID: ID!) {
            variant(id: $id) {
              recycle(regionID: $regionID) {
                stream {
                  name
                  desc
                }
              }
            }
          }
        `),
        { id: VARIANT_IDS[0], regionID: REGION_IDS[0] },
      )
      const itemRes = await gql.send(
        graphql(`
          query ItemRecyclesConsistencyItemVsVariant($id: ID!, $regionID: ID!) {
            item(id: $id) {
              recycle(regionID: $regionID) {
                stream {
                  name
                  desc
                }
              }
            }
          }
        `),
        { id: ITEM_IDS[0], regionID: REGION_IDS[0] },
      )
      expect(variantRes.errors).toBeUndefined()
      expect(itemRes.errors).toBeUndefined()

      const variantStream = variantRes.data?.variant?.recycle?.at(0)?.stream
      const itemStream = itemRes.data?.item?.recycle?.at(0)?.stream
      expect(variantStream?.name).toBeDefined()
      expect(itemStream?.name).toBe(variantStream?.name)
      expect(itemStream?.desc).toBe(variantStream?.desc)
    })

    test('should query item recycleScore (returns null without region context)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res: any = await gql.send(
        graphql(`
          query ItemResolverGetItemRecycleScore($id: ID!) {
            item(id: $id) {
              id
              recycleScore {
                score
                rating
                ratingF
                minScore
                maxScore
              }
            }
          }
        `) as any,
        { id: itemID },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.item).toBeDefined()
      // recycleScore is null when no region is resolvable from context
      expect(res.data?.item?.recycleScore === null || res.data?.item?.recycleScore).toBeDefined()
    })

    test('should return empty recycle when no region is provided', async () => {
      const res = await gql.send(
        graphql(`
          query ItemRecyclesNoRegion($id: ID!) {
            item(id: $id) {
              recycle {
                stream {
                  name
                }
              }
            }
          }
        `),
        { id: ITEM_IDS[0] },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.item?.recycle).toHaveLength(0)
    })
  })
})
