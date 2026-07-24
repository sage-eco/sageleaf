import { MikroORM } from '@mikro-orm/postgresql'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import { graphql } from '@test/gql'
import { ChangeStatus, RefModelType } from '@test/gql/types.generated'
import { GraphQLTestClient } from '@test/graphql.utils'

import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { CATEGORY_IDS, TestCategorySeeder } from '@src/db/seeds/TestCategorySeeder'
import { TestMaterialSeeder } from '@src/db/seeds/TestMaterialSeeder'
import { TestProcessSeeder } from '@src/db/seeds/TestProcessSeeder'
import { TestTagSeeder } from '@src/db/seeds/TestTagSeeder'
import { TestVariantSeeder } from '@src/db/seeds/TestVariantSeeder'
import { UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'
import { CATEGORY_ROOT } from '@src/product/category.entity'
import { WindmillMockService } from '@src/windmill/windmill.mock.service'
import { WindmillService } from '@src/windmill/windmill.service'

describe('CategoryResolver (integration)', () => {
  let app: INestApplication
  let gql: GraphQLTestClient
  let packagingID: string

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

    const orm = module.get<MikroORM>(MikroORM)

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

    packagingID = CATEGORY_IDS[0]
  })

  afterAll(async () => {
    await app.close()
  })

  test('should query categories with pagination', async () => {
    const res = await gql.send(
      graphql(`
        query CategoryResolverListCategories($first: Int) {
          categories(first: $first) {
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
      { first: 20 },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.categories.nodes).toHaveLength(11)
    expect(res.data?.categories.totalCount).toBe(11)
  })

  test('should query a single category', async () => {
    const res = await gql.send(
      graphql(`
        query CategoryResolverGetCategory($id: ID!) {
          category(id: $id) {
            id
            name
          }
        }
      `),
      { id: packagingID },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.category).toBeDefined()
    expect(res.data?.category?.id).toBe(packagingID)
  })

  test('should query the root category', async () => {
    const res = await gql.send(
      graphql(`
        query CategoryResolverGetCategoryRoot {
          categoryRoot {
            id
            name
          }
        }
      `),
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.categoryRoot).toBeDefined()
    expect(res.data?.categoryRoot?.id).toBe(CATEGORY_ROOT)
  })

  test('should query category schema', async () => {
    const res = await gql.send(
      graphql(`
        query CategoryResolverGetCategorySchema {
          categorySchema {
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
    expect(res.errors).toBeUndefined()
    expect(res.data?.categorySchema).toBeDefined()
    expect(res.data?.categorySchema?.create).toBeDefined()
    expect(res.data?.categorySchema?.update).toBeDefined()
  })

  test('should query category item ref schema', async () => {
    const res = await gql.send(
      graphql(`
        query CategoryResolverGetCategoryItemRefSchema($refModel: RefModelType!) {
          categorySchema {
            addRef(refModel: $refModel) {
              schema
            }
          }
        }
      `),
      { refModel: RefModelType.Item },
    )
    expect(res.errors).toBeUndefined()
    const addSchema = res.data?.categorySchema?.addRef?.schema as any
    expect(addSchema?.properties?.refs).toBeDefined()
    expect(addSchema?.properties?.inputs).toBeUndefined()
  })

  test('should query category parents with pagination', async () => {
    const res = await gql.send(
      graphql(`
        query CategoryResolverGetCategoryParents($id: ID!, $first: Int) {
          category(id: $id) {
            id
            parents(first: $first) {
              nodes {
                id
                name
              }
              totalCount
            }
          }
        }
      `),
      { id: packagingID, first: 10 },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.category?.parents).toBeDefined()
    expect(Array.isArray(res.data?.category?.parents.nodes)).toBe(true)
  })

  test('should query category children with pagination', async () => {
    const res = await gql.send(
      graphql(`
        query CategoryResolverGetCategoryChildren($id: ID!, $first: Int) {
          category(id: $id) {
            id
            children(first: $first) {
              nodes {
                id
                name
              }
              totalCount
            }
          }
        }
      `),
      { id: CATEGORY_ROOT, first: 10 },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.category?.children).toBeDefined()
    expect(Array.isArray(res.data?.category?.children.nodes)).toBe(true)
  })

  test('should query category items with pagination', async () => {
    const res = await gql.send(
      graphql(`
        query CategoryResolverGetCategoryItems($id: ID!, $first: Int) {
          category(id: $id) {
            id
            items(first: $first) {
              nodes {
                id
                name
              }
              totalCount
            }
          }
        }
      `),
      { id: packagingID, first: 10 },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.category?.items).toBeDefined()
    expect(Array.isArray(res.data?.category?.items.nodes)).toBe(true)
  })

  test('should update a category', async () => {
    const res = await gql.send(
      graphql(`
        mutation CategoryResolverUpdateCategory($input: UpdateCategoryInput!) {
          updateCategory(input: $input) {
            category {
              id
              name
            }
          }
        }
      `),
      {
        input: {
          id: packagingID,
          name: 'Updated Category Name',
        },
      },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.updateCategory?.category?.id).toBe(packagingID)
    expect(res.data?.updateCategory?.category?.name).toBe('Updated Category Name')
  })

  test('should return error for non-existent category', async () => {
    const res = await gql.send(
      graphql(`
        query CategoryResolverGetNonExistentCategory($id: ID!) {
          category(id: $id) {
            id
          }
        }
      `),
      { id: 'non-existent-id' },
    )
    expect(res.errors).toBeTruthy()
    expect(res.errors?.[0].message).toContain('Category not found')
  })

  // Comprehensive Create Tests
  describe('CreateCategory comprehensive field tests', () => {
    test('should create category with all text fields', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateCategoryAllText($input: CreateCategoryInput!) {
            createCategory(input: $input) {
              category {
                id
                name
                desc
                descShort
                imageURL
              }
            }
          }
        `),
        {
          input: {
            name: 'New Test Category',
            desc: 'Detailed category description',
            descShort: 'Short desc',
            imageURL: 'https://example.com/category.jpg',
            lang: 'en',
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createCategory?.category).toBeDefined()
      expect(res.data?.createCategory?.category?.name).toBe('New Test Category')
      expect(res.data?.createCategory?.category?.desc).toBe('Detailed category description')
      expect(res.data?.createCategory?.category?.descShort).toBe('Short desc')
      expect(res.data?.createCategory?.category?.imageURL).toBe('https://example.com/category.jpg')
    })

    test('should create category with translated fields', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateCategoryTranslated($input: CreateCategoryInput!) {
            createCategory(input: $input) {
              category {
                id
                name
              }
            }
          }
        `),
        {
          input: {
            nameTr: [
              { lang: 'en', text: 'English Category' },
              { lang: 'sv', text: 'Svenska Kategori' },
            ],
            descTr: [
              { lang: 'en', text: 'English Description' },
              { lang: 'sv', text: 'Svenska Beskrivning' },
            ],
            descShortTr: [
              { lang: 'en', text: 'Short' },
              { lang: 'sv', text: 'Kort' },
            ],
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createCategory?.category).toBeDefined()
    })

    test('should create category with change tracking', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateCategoryWithChange($input: CreateCategoryInput!) {
            createCategory(input: $input) {
              category {
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
            name: 'Category with Change',
            change: {
              title: 'Add new category',
              status: ChangeStatus.Draft,
            },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createCategory?.category).toBeDefined()
      expect(res.data?.createCategory?.category?.name).toBe('Category with Change')
      expect(res.data?.createCategory?.change).toBeDefined()
      expect(res.data?.createCategory?.change?.title).toBe('Add new category')
      expect(res.data?.createCategory?.change?.status).toBe('DRAFT')
    })
  })

  // Comprehensive Update Tests
  describe('UpdateCategory comprehensive field tests', () => {
    let testCategoryID: string

    beforeAll(async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateCategoryForUpdate($input: CreateCategoryInput!) {
            createCategory(input: $input) {
              category {
                id
              }
            }
          }
        `),
        {
          input: {
            name: 'Category for Updates',
          },
        },
      )
      if (res.data?.createCategory?.category?.id) {
        testCategoryID = res.data?.createCategory?.category?.id
      } else {
        throw new Error('Failed to create category for update tests')
      }
    })

    test('should update category text fields', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateCategoryText($input: UpdateCategoryInput!) {
            updateCategory(input: $input) {
              category {
                id
                name
                desc
                descShort
              }
            }
          }
        `),
        {
          input: {
            id: testCategoryID,
            name: 'Updated Category Name',
            desc: 'Updated Description',
            descShort: 'Updated Short',
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateCategory?.category?.id).toBe(testCategoryID)
      expect(res.data?.updateCategory?.category?.name).toBe('Updated Category Name')
      expect(res.data?.updateCategory?.category?.desc).toBe('Updated Description')
      expect(res.data?.updateCategory?.category?.descShort).toBe('Updated Short')
    })

    test('should update category with change tracking', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateCategoryWithChange($input: UpdateCategoryInput!) {
            updateCategory(input: $input) {
              category {
                id
                name
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
            id: testCategoryID,
            name: 'Updated via Change',
            change: {
              title: 'Update category test',
              status: ChangeStatus.Proposed,
            },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateCategory?.category).toBeDefined()
      expect(res.data?.updateCategory?.category?.id).toBe(testCategoryID)
      expect(res.data?.updateCategory?.category?.name).toBe('Updated via Change')
      expect(res.data?.updateCategory?.change).toBeDefined()
      expect(res.data?.updateCategory?.change?.status).toBe('PROPOSED')
    })

    test('should return currentCategory with DB state when using change tracking', async () => {
      // First set a known name directly in the DB
      const directRes = await gql.send(
        graphql(`
          mutation CategorySetCurrentName($input: UpdateCategoryInput!) {
            updateCategory(input: $input) {
              category {
                id
                name
              }
            }
          }
        `),
        { input: { id: testCategoryID, name: 'Current DB Name' } },
      )
      expect(directRes.errors).toBeUndefined()

      // Now update via change — category should show proposed, currentCategory the DB value
      const changeRes = await gql.send(
        graphql(`
          mutation UpdateCategoryWithChangeCurrentCategory($input: UpdateCategoryInput!) {
            updateCategory(input: $input) {
              category {
                id
                name
              }
              currentCategory {
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
            id: testCategoryID,
            name: 'Proposed Name',
            change: { title: 'current category test' },
          },
        },
      )
      expect(changeRes.errors).toBeUndefined()
      expect(changeRes.data?.updateCategory?.category?.name).toBe('Proposed Name')
      expect(changeRes.data?.updateCategory?.currentCategory?.name).toBe('Current DB Name')
      expect(changeRes.data?.updateCategory?.currentCategory?.id).toBe(testCategoryID)
    })
  })

  describe('history tracking', () => {
    let historyCategoryID: string

    test('should record history on direct create', async () => {
      const createRes = await gql.send(
        graphql(`
          mutation CategoryHistoryCreate($input: CreateCategoryInput!) {
            createCategory(input: $input) {
              category {
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
        { input: { name: 'History Test Category' } },
      )
      expect(createRes.errors).toBeUndefined()
      const category = createRes.data?.createCategory?.category
      expect(category).toBeDefined()
      historyCategoryID = category!.id
      expect(category!.history.nodes).toHaveLength(1)
      expect(category!.history.nodes![0].user).toBeDefined()
      expect(category!.history.nodes![0].original).toBeNull()
      expect(category!.history.nodes![0].changes).toBeTruthy()
    })

    test('should record history on direct update', async () => {
      const updateRes = await gql.send(
        graphql(`
          mutation CategoryHistoryUpdate($input: UpdateCategoryInput!) {
            updateCategory(input: $input) {
              category {
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
        { input: { id: historyCategoryID, name: 'Updated History Category' } },
      )
      expect(updateRes.errors).toBeUndefined()
      const category = updateRes.data?.updateCategory?.category
      expect(category).toBeDefined()
      expect(category!.history.nodes).toHaveLength(2)
      const latest = category!.history.nodes!.at(-1)!
      expect(latest.original).toBeTruthy()
      expect(latest.changes).toBeTruthy()
    })
  })
})
