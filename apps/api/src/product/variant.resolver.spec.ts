import { MikroORM } from '@mikro-orm/postgresql'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import { graphql } from '@test/gql'
import { ChangeStatus, RefModelType } from '@test/gql/types.generated'
import { GraphQLTestClient } from '@test/graphql.utils'

import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { MATERIAL_IDS, TestMaterialSeeder } from '@src/db/seeds/TestMaterialSeeder'
import { ORG_IDS, REGION_IDS, TestProcessSeeder } from '@src/db/seeds/TestProcessSeeder'
import { TAG_IDS, TestTagSeeder } from '@src/db/seeds/TestTagSeeder'
import {
  COMPONENT_IDS,
  ITEM_IDS,
  SOURCE_IDS,
  TestVariantSeeder,
  VARIANT_IDS,
} from '@src/db/seeds/TestVariantSeeder'
import { UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'
import { Region } from '@src/geo/region.entity'
import { Material } from '@src/process/material.entity'
import { Process, ProcessIntent } from '@src/process/process.entity'
import { Variant as VariantEntity } from '@src/product/variant.entity'

describe('VariantResolver (integration)', () => {
  let app: INestApplication
  let gql: GraphQLTestClient
  let orm: MikroORM
  let variantID: string

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule],
    }).compile()

    app = module.createNestApplication()
    await app.init()

    gql = new GraphQLTestClient(app)

    orm = module.get<MikroORM>(MikroORM)

    await clearDatabase(orm, 'public', ['users'])
    await orm.seeder.seed(
      BaseSeeder,
      UserSeeder,
      TestMaterialSeeder,
      TestProcessSeeder,
      TestTagSeeder,
      TestVariantSeeder,
    )

    await gql.signIn('admin', 'password')

    variantID = VARIANT_IDS[0]
  })

  afterAll(async () => {
    await app.close()
  })

  test('should query variants with pagination', async () => {
    const res = await gql.send(
      graphql(`
        query VariantResolverListVariants($first: Int) {
          variants(first: $first) {
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
    expect(res.data?.variants.nodes?.length).toBeGreaterThan(0)
    expect(res.data?.variants.totalCount).toBeGreaterThan(0)
  })

  test('should query a single variant', async () => {
    const res = await gql.send(
      graphql(`
        query VariantResolverGetVariant($id: ID!) {
          variant(id: $id) {
            id
            name
          }
        }
      `),
      { id: variantID },
    )
    expect(res.data?.variant).toBeDefined()
    expect(res.data?.variant?.id).toBe(variantID)
  })

  test('should query variant schema', async () => {
    const res = await gql.send(
      graphql(`
        query VariantResolverGetVariantSchema {
          variantSchema {
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
    expect(res.data?.variantSchema).toBeDefined()
    expect(res.data?.variantSchema?.create).toBeDefined()
    expect(res.data?.variantSchema?.update).toBeDefined()
  })

  test('should query variant addRef schema with component payload inputs', async () => {
    const res = await gql.send(
      graphql(`
        query VariantResolverGetVariantComponentRefSchema($refModel: RefModelType!) {
          variantSchema {
            addRef(refModel: $refModel) {
              schema
              uischema
            }
          }
        }
      `),
      { refModel: RefModelType.Component },
    )
    expect(res.errors).toBeUndefined()
    const addSchema = res.data?.variantSchema?.addRef?.schema as any
    expect(addSchema?.properties?.refs).toBeDefined()
    expect(addSchema?.properties?.inputs).toBeDefined()
    expect(addSchema?.properties?.inputs?.items?.properties?.quantity).toBeDefined()
    expect(addSchema?.properties?.inputs?.items?.properties?.unit).toBeDefined()
    expect(addSchema?.properties?.ref).toBeUndefined()
  })

  test('should query variant tag ref schema with payload inputs', async () => {
    const res = await gql.send(
      graphql(`
        query VariantResolverGetVariantTagRefSchema($refModel: RefModelType!) {
          variantSchema {
            addRef(refModel: $refModel) {
              schema
            }
          }
        }
      `),
      { refModel: RefModelType.Tag },
    )
    expect(res.errors).toBeUndefined()
    const addSchema = res.data?.variantSchema?.addRef?.schema as any
    expect(addSchema?.properties?.refs).toBeDefined()
    expect(addSchema?.properties?.inputs).toBeDefined()
    expect(addSchema?.properties?.inputs?.items?.properties?.meta).toBeDefined()
  })

  test('should query variant items with pagination', async () => {
    const res = await gql.send(
      graphql(`
        query VariantResolverGetVariantItems($id: ID!, $first: Int) {
          variant(id: $id) {
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
      { id: variantID, first: 10 },
    )
    expect(res.data?.variant?.items).toBeDefined()
    expect(Array.isArray(res.data?.variant?.items.nodes)).toBe(true)
  })

  test('should query variant orgs with pagination', async () => {
    const res = await gql.send(
      graphql(`
        query VariantResolverGetVariantOrgs($id: ID!, $first: Int) {
          variant(id: $id) {
            id
            orgs(first: $first) {
              nodes {
                org {
                  id
                  name
                }
              }
              totalCount
            }
          }
        }
      `),
      { id: variantID, first: 10 },
    )
    expect(res.data?.variant?.orgs).toBeDefined()
    expect(Array.isArray(res.data?.variant?.orgs.nodes)).toBe(true)
  })

  test('should query variant tags with pagination', async () => {
    const res = await gql.send(
      graphql(`
        query VariantResolverGetVariantTags($id: ID!, $first: Int) {
          variant(id: $id) {
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
      { id: variantID, first: 10 },
    )
    expect(res.data?.variant?.tags).toBeDefined()
    expect(Array.isArray(res.data?.variant?.tags.nodes)).toBe(true)
  })

  test('should query variant components with pagination', async () => {
    const res = await gql.send(
      graphql(`
        query VariantResolverGetVariantComponents($id: ID!, $first: Int) {
          variant(id: $id) {
            id
            components(first: $first) {
              nodes {
                component {
                  id
                  name
                }
              }
              totalCount
            }
          }
        }
      `),
      { id: variantID, first: 10 },
    )
    expect(res.data?.variant?.components).toBeDefined()
    expect(Array.isArray(res.data?.variant?.components.nodes)).toBe(true)
  })

  test('should create a variant', async () => {
    const res = await gql.send(
      graphql(`
        mutation VariantResolverCreateVariant($input: CreateVariantInput!) {
          createVariant(input: $input) {
            variant {
              id
              name
            }
          }
        }
      `),
      {
        input: {
          name: 'Test Variant',
        },
      },
    )
    expect(res.data?.createVariant?.variant).toBeDefined()
    expect(res.data?.createVariant?.variant?.name).toBe('Test Variant')
  })

  test('should update a variant', async () => {
    const res = await gql.send(
      graphql(`
        mutation VariantResolverUpdateVariant($input: UpdateVariantInput!) {
          updateVariant(input: $input) {
            variant {
              id
              name
            }
          }
        }
      `),
      {
        input: {
          id: variantID,
          name: 'Updated Variant Name',
        },
      },
    )
    expect(res.data?.updateVariant?.variant?.id).toBe(variantID)
  })

  test('should return error for non-existent variant', async () => {
    const res = await gql.send(
      graphql(`
        query VariantResolverGetNonExistentVariant($id: ID!) {
          variant(id: $id) {
            id
          }
        }
      `),
      { id: 'non-existent-id' },
    )
    expect(res.errors).toBeDefined()
    expect(res.errors?.[0].message).toContain('Variant not found')
  })

  // Comprehensive Create Tests
  describe('CreateVariant comprehensive field tests', () => {
    test('should create variant with all text fields', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateVariantAllText($input: CreateVariantInput!) {
            createVariant(input: $input) {
              variant {
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
            name: 'Comprehensive Test Variant',
            desc: 'This is a detailed description',
            imageURL: 'https://example.com/variant.jpg',
            lang: 'en',
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createVariant?.variant).toBeDefined()
      expect(res.data?.createVariant?.variant?.name).toBe('Comprehensive Test Variant')
      expect(res.data?.createVariant?.variant?.desc).toBe('This is a detailed description')
      expect(res.data?.createVariant?.variant?.imageURL).toBeNull()
    })

    test('should create variant with translated fields (nameTr, descTr)', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateVariantTranslated($input: CreateVariantInput!) {
            createVariant(input: $input) {
              variant {
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
              { lang: 'en', text: 'English Name' },
              { lang: 'sv', text: 'Svenska Namn' },
            ],
            descTr: [
              { lang: 'en', text: 'English Description' },
              { lang: 'sv', text: 'Svenska Beskrivning' },
            ],
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createVariant?.variant).toBeDefined()
      expect(res.data?.createVariant?.variant?.name).toBe('English Name')
      expect(res.data?.createVariant?.variant?.desc).toBe('English Description')
    })

    test('should create variant with items relationship', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateVariantWithItems($input: CreateVariantInput!) {
            createVariant(input: $input) {
              variant {
                id
                name
                items {
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
            name: 'Variant with Items',
            items: [{ id: ITEM_IDS[0] }, { id: ITEM_IDS[1] }],
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createVariant?.variant).toBeDefined()
      expect(res.data?.createVariant?.variant?.name).toBe('Variant with Items')
      expect(res.data?.createVariant?.variant?.items?.totalCount).toBe(2)
      expect(res.data?.createVariant?.variant?.items?.nodes).toHaveLength(2)
      expect(res.data?.createVariant?.variant?.items?.nodes?.map((n) => n.id)).toContain(
        ITEM_IDS[0],
      )
      expect(res.data?.createVariant?.variant?.items?.nodes?.map((n) => n.id)).toContain(
        ITEM_IDS[1],
      )
    })

    test('should create variant with components relationship', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateVariantWithComponents($input: CreateVariantInput!) {
            createVariant(input: $input) {
              variant {
                id
                name
                components {
                  nodes {
                    component {
                      id
                    }
                  }
                  totalCount
                }
              }
            }
          }
        `),
        {
          input: {
            name: 'Variant with Components',
            components: [{ id: COMPONENT_IDS[0] }, { id: COMPONENT_IDS[1] }],
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createVariant?.variant).toBeDefined()
      expect(res.data?.createVariant?.variant?.name).toBe('Variant with Components')
      expect(res.data?.createVariant?.variant?.components?.totalCount).toBe(2)
      expect(res.data?.createVariant?.variant?.components?.nodes).toHaveLength(2)
      expect(
        res.data?.createVariant?.variant?.components?.nodes?.map((n) => n.component.id),
      ).toContain(COMPONENT_IDS[0])
      expect(
        res.data?.createVariant?.variant?.components?.nodes?.map((n) => n.component.id),
      ).toContain(COMPONENT_IDS[1])
    })

    test('should create variant with region relationship', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateVariantWithRegion($input: CreateVariantInput!) {
            createVariant(input: $input) {
              variant {
                id
                name
              }
            }
          }
        `),
        {
          input: {
            name: 'Variant with Region',
            region: { id: REGION_IDS[0] },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createVariant?.variant).toBeDefined()
      expect(res.data?.createVariant?.variant?.name).toBe('Variant with Region')
    })

    test('should create variant with orgs pivot relationship', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateVariantWithOrgs($input: CreateVariantInput!) {
            createVariant(input: $input) {
              variant {
                id
                name
                orgs {
                  nodes {
                    org {
                      id
                    }
                  }
                  totalCount
                }
              }
            }
          }
        `),
        {
          input: {
            name: 'Variant with Orgs',
            orgs: [{ id: ORG_IDS[0] }, { id: ORG_IDS[1] }],
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createVariant?.variant).toBeDefined()
      expect(res.data?.createVariant?.variant?.name).toBe('Variant with Orgs')
      expect(res.data?.createVariant?.variant?.orgs?.totalCount).toBe(2)
      expect(res.data?.createVariant?.variant?.orgs?.nodes).toHaveLength(2)
      expect(res.data?.createVariant?.variant?.orgs?.nodes?.map((n) => n.org.id)).toContain(
        ORG_IDS[0],
      )
      expect(res.data?.createVariant?.variant?.orgs?.nodes?.map((n) => n.org.id)).toContain(
        ORG_IDS[1],
      )
    })

    test('should create variant with tags including metadata', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateVariantWithTags($input: CreateVariantInput!) {
            createVariant(input: $input) {
              variant {
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
            name: 'Variant with Tags',
            tags: [
              { id: TAG_IDS[2], meta: { count: 5 } },
              { id: TAG_IDS[0], meta: { score: 95 } },
            ],
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createVariant?.variant).toBeDefined()
      expect(res.data?.createVariant?.variant?.name).toBe('Variant with Tags')
      expect(res.data?.createVariant?.variant?.tags?.totalCount).toBe(2)
      expect(res.data?.createVariant?.variant?.tags?.nodes).toHaveLength(2)
      expect(res.data?.createVariant?.variant?.tags?.nodes?.map((n) => n.id)).toContain(TAG_IDS[2])
      expect(res.data?.createVariant?.variant?.tags?.nodes?.map((n) => n.id)).toContain(TAG_IDS[0])
    })

    test('should create variant with change tracking (change input)', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateVariantWithChange($input: CreateVariantInput!) {
            createVariant(input: $input) {
              variant {
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
            name: 'Variant with Change',
            change: {
              title: 'Add new variant via change',
              description: 'Testing change-based creation',
              status: ChangeStatus.Draft,
            },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createVariant?.variant).toBeDefined()
      expect(res.data?.createVariant?.variant?.name).toBe('Variant with Change')
      expect(res.data?.createVariant?.change).toBeDefined()
      expect(res.data?.createVariant?.change?.title).toBe('Add new variant via change')
      expect(res.data?.createVariant?.change?.status).toBe('DRAFT')
    })

    test('should create variant with all fields combined', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateVariantAllFields($input: CreateVariantInput!) {
            createVariant(input: $input) {
              variant {
                id
                name
                desc
                imageURL
                items {
                  totalCount
                }
                components {
                  totalCount
                }
                orgs {
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
            name: 'Complete Variant',
            desc: 'All fields test',
            imageURL: 'https://example.com/complete.jpg',
            lang: 'en',
            items: [{ id: ITEM_IDS[0] }],
            components: [{ id: COMPONENT_IDS[0] }],
            orgs: [{ id: ORG_IDS[0] }],
            tags: [{ id: TAG_IDS[2], meta: { count: 10 } }],
            region: { id: REGION_IDS[0] },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createVariant?.variant).toBeDefined()
      expect(res.data?.createVariant?.variant?.name).toBe('Complete Variant')
      expect(res.data?.createVariant?.variant?.desc).toBe('All fields test')
      expect(res.data?.createVariant?.variant?.imageURL).toBeNull()
      expect(res.data?.createVariant?.variant?.items?.totalCount).toBe(1)
      expect(res.data?.createVariant?.variant?.components?.totalCount).toBe(1)
      expect(res.data?.createVariant?.variant?.orgs?.totalCount).toBe(1)
      expect(res.data?.createVariant?.variant?.tags?.totalCount).toBe(1)
    })
  })

  // Comprehensive Update Tests
  describe('UpdateVariant comprehensive field tests', () => {
    let testVariantID: string

    beforeAll(async () => {
      // Create a variant to update in all tests
      const res = await gql.send(
        graphql(`
          mutation CreateVariantForUpdate($input: CreateVariantInput!) {
            createVariant(input: $input) {
              variant {
                id
              }
            }
          }
        `),
        {
          input: {
            name: 'Variant for Updates',
          },
        },
      )
      if (res?.data?.createVariant?.variant?.id) {
        testVariantID = res.data?.createVariant?.variant?.id
      } else {
        throw new Error('Failed to create variant for update tests')
      }
    })

    test('should update variant text fields', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateVariantText($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
                id
                name
                desc
              }
            }
          }
        `),
        {
          input: {
            id: testVariantID,
            name: 'Updated Name',
            desc: 'Updated Description',
          },
        },
      )
      expect(res.data?.updateVariant?.variant?.name).toBe('Updated Name')
      expect(res.data?.updateVariant?.variant?.desc).toBe('Updated Description')
    })

    test('should add items to existing variant', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateVariantAddItems($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
                id
                items {
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
            id: testVariantID,
            addItems: [{ id: ITEM_IDS[0] }, { id: ITEM_IDS[1] }],
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateVariant?.variant).toBeDefined()
      expect(res.data?.updateVariant?.variant?.items?.totalCount).toBe(2)
      expect(res.data?.updateVariant?.variant?.items?.nodes?.map((n) => n.id)).toContain(
        ITEM_IDS[0],
      )
      expect(res.data?.updateVariant?.variant?.items?.nodes?.map((n) => n.id)).toContain(
        ITEM_IDS[1],
      )
    })

    test('should remove items from variant', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateVariantRemoveItems($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
                id
                items {
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
            id: testVariantID,
            removeItems: [ITEM_IDS[0]],
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateVariant?.variant).toBeDefined()
      expect(res.data?.updateVariant?.variant?.items?.totalCount).toBe(1)
      expect(res.data?.updateVariant?.variant?.items?.nodes?.map((n) => n.id)).not.toContain(
        ITEM_IDS[0],
      )
      expect(res.data?.updateVariant?.variant?.items?.nodes?.map((n) => n.id)).toContain(
        ITEM_IDS[1],
      )
    })

    test('should add components to existing variant', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateVariantAddComponents($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
                id
                components {
                  nodes {
                    component {
                      id
                    }
                  }
                  totalCount
                }
              }
            }
          }
        `),
        {
          input: {
            id: testVariantID,
            addComponents: [{ id: COMPONENT_IDS[0] }],
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateVariant?.variant).toBeDefined()
      expect(res.data?.updateVariant?.variant?.components?.totalCount).toBe(1)
      expect(
        res.data?.updateVariant?.variant?.components?.nodes?.map((n) => n.component.id),
      ).toContain(COMPONENT_IDS[0])
    })

    test('should remove components from variant', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateVariantRemoveComponents($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
                id
                components {
                  nodes {
                    component {
                      id
                    }
                  }
                  totalCount
                }
              }
            }
          }
        `),
        {
          input: {
            id: testVariantID,
            removeComponents: [COMPONENT_IDS[0]],
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateVariant?.variant).toBeDefined()
      expect(res.data?.updateVariant?.variant?.components?.totalCount).toBe(0)
      expect(res.data?.updateVariant?.variant?.components?.nodes).toHaveLength(0)
    })

    test('should set region via mutation and query it back as paginated regions', async () => {
      const mutRes = await gql.send(
        graphql(`
          mutation UpdateVariantSetRegion($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
                id
                regions {
                  nodes {
                    id
                  }
                  totalCount
                }
              }
            }
          }
        `),
        { input: { id: testVariantID, region: { id: REGION_IDS[0] } } },
      )
      expect(mutRes.errors).toBeUndefined()
      expect(mutRes.data?.updateVariant?.variant?.regions?.totalCount).toBe(1)

      const queryRes = await gql.send(
        graphql(`
          query GetVariantRegions($id: ID!) {
            variant(id: $id) {
              id
              regions {
                nodes {
                  id
                }
                totalCount
              }
            }
          }
        `),
        { id: testVariantID },
      )
      expect(queryRes.errors).toBeUndefined()
      expect(queryRes.data?.variant?.regions?.totalCount).toBe(1)
      expect(queryRes.data?.variant?.regions?.nodes?.[0]?.id).toBe(REGION_IDS[0])
    })

    test('should update variant with change tracking', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateVariantWithChange($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
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
            id: testVariantID,
            name: 'Updated via Change',
            change: {
              title: 'Update variant test',
              status: ChangeStatus.Draft,
            },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateVariant?.variant).toBeDefined()
      expect(res.data?.updateVariant?.variant?.name).toBe('Updated via Change')
      expect(res.data?.updateVariant?.change).toBeDefined()
      expect(res.data?.updateVariant?.change?.title).toBe('Update variant test')
      expect(res.data?.updateVariant?.change?.status).toBe('DRAFT')
    })

    test('should return currentVariant with DB state when using change tracking', async () => {
      // First set a known name directly in the DB
      const directRes = await gql.send(
        graphql(`
          mutation SetCurrentName($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
                id
                name
              }
            }
          }
        `),
        { input: { id: testVariantID, name: 'Current DB Name' } },
      )
      expect(directRes.errors).toBeUndefined()

      // Now update via change — variant should show proposed, currentVariant the DB value
      const changeRes = await gql.send(
        graphql(`
          mutation UpdateWithChangeCurrentVariant($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
                id
                name
              }
              currentVariant {
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
            id: testVariantID,
            name: 'Proposed Name',
            change: { title: 'current variant test' },
          },
        },
      )
      expect(changeRes.errors).toBeUndefined()
      expect(changeRes.data?.updateVariant?.variant?.name).toBe('Proposed Name')
      expect(changeRes.data?.updateVariant?.currentVariant?.name).toBe('Current DB Name')
      expect(changeRes.data?.updateVariant?.currentVariant?.id).toBe(testVariantID)
    })

    test('should keep currentVariant relation refs isolated while staging new item/component/org/region refs', async () => {
      const createRes = await gql.send(
        graphql(`
          mutation CreateVariantForCurrentRefs($input: CreateVariantInput!) {
            createVariant(input: $input) {
              variant {
                id
              }
            }
          }
        `),
        { input: { name: 'Variant Current Refs' } },
      )
      expect(createRes.errors).toBeUndefined()
      const currentRefsVariantID = createRes.data!.createVariant!.variant!.id

      const directRes = await gql.send(
        graphql(`
          mutation UpdateVariantCurrentBaselineRefs($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
                id
              }
            }
          }
        `),
        {
          input: {
            id: currentRefsVariantID,
            items: [{ id: ITEM_IDS[1] }],
            components: [{ id: COMPONENT_IDS[1], quantity: 2.5, unit: 'ml' }],
            orgs: [{ id: ORG_IDS[0] }],
            region: { id: REGION_IDS[0] },
          },
        },
      )
      expect(directRes.errors).toBeUndefined()

      const changeRes = await gql.send(
        graphql(`
          mutation UpdateVariantCurrentProposedRefs($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
                id
                items {
                  nodes {
                    id
                  }
                }
                components {
                  nodes {
                    component {
                      id
                    }
                    quantity
                    unit
                  }
                }
                orgs {
                  nodes {
                    org {
                      id
                    }
                  }
                }
                regions {
                  nodes {
                    id
                  }
                }
              }
              currentVariant {
                id
                items {
                  nodes {
                    id
                  }
                }
                components {
                  nodes {
                    component {
                      id
                    }
                    quantity
                    unit
                  }
                }
                orgs {
                  nodes {
                    org {
                      id
                    }
                  }
                }
                regions {
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
            id: currentRefsVariantID,
            items: [{ id: ITEM_IDS[0] }],
            components: [{ id: COMPONENT_IDS[0], quantity: 5, unit: 'g' }],
            orgs: [{ id: ORG_IDS[1] }],
            region: { id: REGION_IDS[1] },
            change: { title: 'current variant refs' },
          },
        },
      )

      expect(changeRes.errors).toBeUndefined()
      expect(
        changeRes.data?.updateVariant?.currentVariant?.regions?.nodes?.map((node) => node.id),
      ).toEqual([REGION_IDS[0]])

      const changeID = changeRes.data!.updateVariant!.change!.id
      const approveRes = await gql.send(
        graphql(`
          mutation UpdateVariantApproveCurrentRefs($input: UpdateChangeInput!) {
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
          mutation UpdateVariantMergeCurrentRefs($id: ID!) {
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

      const mergedVariant = await gql.send(
        graphql(`
          query UpdateVariantMergedCurrentRefs($id: ID!) {
            variant(id: $id) {
              id
              items {
                nodes {
                  id
                }
              }
              components {
                nodes {
                  component {
                    id
                  }
                  quantity
                  unit
                }
              }
              orgs {
                nodes {
                  org {
                    id
                  }
                }
              }
              regions {
                nodes {
                  id
                }
              }
            }
          }
        `),
        { id: currentRefsVariantID },
      )
      expect(mergedVariant.errors).toBeUndefined()
      expect(mergedVariant.data?.variant?.items?.nodes?.map((node) => node.id)).toEqual([
        ITEM_IDS[0],
      ])
      expect(mergedVariant.data?.variant?.components?.nodes).toEqual([
        expect.objectContaining({
          component: expect.objectContaining({ id: COMPONENT_IDS[0] }),
          quantity: 5,
          unit: 'g',
        }),
      ])
      expect(mergedVariant.data?.variant?.orgs?.nodes?.map((node) => node.org.id)).toEqual([
        ORG_IDS[1],
      ])
      expect(mergedVariant.data?.variant?.regions?.nodes?.map((node) => node.id)).toEqual([
        REGION_IDS[0],
        REGION_IDS[1],
      ])
    })

    test('should keep primary region synchronized with staged regions after merge', async () => {
      const createRes = await gql.send(
        graphql(`
          mutation CreateVariantForRegionSync($input: CreateVariantInput!) {
            createVariant(input: $input) {
              variant {
                id
              }
            }
          }
        `),
        { input: { name: 'Variant Region Sync' } },
      )
      expect(createRes.errors).toBeUndefined()
      const regionSyncVariantID = createRes.data!.createVariant!.variant!.id

      const baselineRes = await gql.send(
        graphql(`
          mutation UpdateVariantBaselineRegion($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
                id
              }
            }
          }
        `),
        { input: { id: regionSyncVariantID, region: { id: REGION_IDS[0] } } },
      )
      expect(baselineRes.errors).toBeUndefined()

      const changeRes = await gql.send(
        graphql(`
          mutation UpdateVariantRegionSync($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
                id
                regions {
                  nodes {
                    id
                  }
                }
              }
              currentVariant {
                id
                regions {
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
            id: regionSyncVariantID,
            region: { id: REGION_IDS[1] },
            addRegions: [{ id: REGION_IDS[0] }],
            change: { title: 'variant region sync' },
          },
        },
      )
      expect(changeRes.errors).toBeUndefined()
      expect(
        changeRes.data?.updateVariant?.currentVariant?.regions?.nodes?.map((node) => node.id),
      ).toEqual([REGION_IDS[0]])

      const changeID = changeRes.data!.updateVariant!.change!.id
      const approveRes = await gql.send(
        graphql(`
          mutation UpdateVariantApproveRegionSync($input: UpdateChangeInput!) {
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
          mutation UpdateVariantMergeRegionSync($id: ID!) {
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

      const variant = await orm.em
        .fork()
        .findOne(VariantEntity, { id: regionSyncVariantID } as any, {
          populate: ['region'],
        })
      expect(variant?.region?.id).toBe(REGION_IDS[1])
      expect(variant?.regions).toEqual([REGION_IDS[1], REGION_IDS[0]])
    })

    test('should add and remove tags', async () => {
      const addRes = await gql.send(
        graphql(`
          mutation UpdateVariantAddTags($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
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
            id: testVariantID,
            addTags: [{ id: TAG_IDS[2], meta: { count: 15 } }],
          },
        },
      )
      expect(addRes.errors).toBeUndefined()
      expect(addRes.data?.updateVariant?.variant?.tags?.totalCount).toBeGreaterThanOrEqual(1)

      // Then remove tags
      const removeRes = await gql.send(
        graphql(`
          mutation UpdateVariantRemoveTags($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
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
            id: testVariantID,
            removeTags: [TAG_IDS[2]],
          },
        },
      )
      expect(removeRes.errors).toBeUndefined()
      expect(removeRes.data?.updateVariant?.variant).toBeDefined()
    })

    test('should add and remove orgs', async () => {
      const addRes = await gql.send(
        graphql(`
          mutation UpdateVariantAddOrgs($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
                id
                orgs {
                  totalCount
                }
              }
            }
          }
        `),
        {
          input: {
            id: testVariantID,
            addOrgs: [{ id: ORG_IDS[0] }],
          },
        },
      )
      expect(addRes.errors).toBeUndefined()
      expect(addRes.data?.updateVariant?.variant?.orgs?.totalCount).toBeGreaterThanOrEqual(1)

      // Then remove orgs
      const removeRes = await gql.send(
        graphql(`
          mutation UpdateVariantRemoveOrgs($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
                id
                orgs {
                  totalCount
                }
              }
            }
          }
        `),
        {
          input: {
            id: testVariantID,
            removeOrgs: [ORG_IDS[0]],
          },
        },
      )
      expect(removeRes.errors).toBeUndefined()
      expect(removeRes.data?.updateVariant?.variant).toBeDefined()
    })
  })

  // Batch mutation tests
  describe('Batch mutations', () => {
    test('should handle multiple create mutations in single request', async () => {
      const res = await gql.send(
        graphql(`
          mutation BatchCreateVariants($input1: CreateVariantInput!, $input2: CreateVariantInput!) {
            variant1: createVariant(input: $input1) {
              variant {
                id
                name
              }
            }
            variant2: createVariant(input: $input2) {
              variant {
                id
                name
              }
            }
          }
        `),
        {
          input1: { name: 'Batch Variant 1' },
          input2: { name: 'Batch Variant 2' },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.variant1?.variant).toBeDefined()
      expect(res.data?.variant1?.variant?.name).toBe('Batch Variant 1')
      expect(res.data?.variant2?.variant).toBeDefined()
      expect(res.data?.variant2?.variant?.name).toBe('Batch Variant 2')
    })
  })

  describe('images', () => {
    test('should query images with url and id', async () => {
      const res = await gql.send(
        graphql(`
          query VariantResolverGetVariantImages($id: ID!, $first: Int) {
            variant(id: $id) {
              id
              images(first: $first) {
                nodes {
                  id
                  url
                  size
                }
                totalCount
              }
            }
          }
        `),
        { id: variantID, first: 10 },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.variant?.images).toBeDefined()
      expect(res.data?.variant?.images.totalCount).toBe(SOURCE_IDS.length)
      expect(res.data?.variant?.images.nodes).toHaveLength(SOURCE_IDS.length)
      expect(res.data?.variant?.images.nodes?.[0]?.id).toBeDefined()
      expect(res.data?.variant?.images.nodes?.[0]?.url).toBeDefined()
      expect(res.data?.variant?.images.nodes?.[0]?.url).toContain('sageleaf.app')
    })

    test('imageURL returns the first image url', async () => {
      const res = await gql.send(
        graphql(`
          query VariantResolverGetVariantImageURL($id: ID!) {
            variant(id: $id) {
              id
              imageURL
            }
          }
        `),
        { id: variantID },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.variant?.imageURL).toBeTruthy()
      expect(res.data?.variant?.imageURL).toContain('sageleaf.app')
    })

    test('imageURL is null and images is empty for variant without image sources', async () => {
      const createRes = await gql.send(
        graphql(`
          mutation VariantImagesCreateEmpty($input: CreateVariantInput!) {
            createVariant(input: $input) {
              variant {
                id
                imageURL
                images {
                  totalCount
                }
              }
            }
          }
        `),
        { input: { name: 'No Images Variant' } },
      )
      expect(createRes.errors).toBeUndefined()
      expect(createRes.data?.createVariant?.variant?.imageURL).toBeNull()
      expect(createRes.data?.createVariant?.variant?.images.totalCount).toBe(0)
    })
  })

  describe('sources', () => {
    test('should query variant sources with source id', async () => {
      const res = await gql.send(
        graphql(`
          query VariantResolverGetVariantSources($id: ID!, $first: Int) {
            variant(id: $id) {
              id
              sources(first: $first) {
                nodes {
                  source {
                    id
                  }
                  meta
                }
                totalCount
              }
            }
          }
        `),
        { id: variantID, first: 10 },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.variant?.sources).toBeDefined()
      expect(Array.isArray(res.data?.variant?.sources.nodes)).toBe(true)
      expect(res.data?.variant?.sources.nodes?.[0]?.source?.id).toBeDefined()
    })
  })

  describe('history tracking', () => {
    let historyVariantID: string

    test('should record history on direct create', async () => {
      const createRes = await gql.send(
        graphql(`
          mutation VariantHistoryCreate($input: CreateVariantInput!) {
            createVariant(input: $input) {
              variant {
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
        { input: { name: 'History Test Variant' } },
      )
      expect(createRes.errors).toBeUndefined()
      const variant = createRes.data?.createVariant?.variant
      expect(variant).toBeDefined()
      historyVariantID = variant!.id
      expect(variant!.history.nodes).toHaveLength(1)
      expect(variant!.history.nodes![0].user).toBeDefined()
      expect(variant!.history.nodes![0].original).toBeNull()
      expect(variant!.history.nodes![0].changes).toBeTruthy()
    })

    test('should record history on direct update', async () => {
      const updateRes = await gql.send(
        graphql(`
          mutation VariantHistoryUpdate($input: UpdateVariantInput!) {
            updateVariant(input: $input) {
              variant {
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
        { input: { id: historyVariantID, name: 'Updated History Variant' } },
      )
      expect(updateRes.errors).toBeUndefined()
      const variant = updateRes.data?.updateVariant?.variant
      expect(variant).toBeDefined()
      expect(variant!.history.nodes).toHaveLength(2)
      const latest = variant!.history.nodes!.at(-1)!
      expect(latest.original).toBeTruthy()
      expect(latest.changes).toBeTruthy()
    })
  })

  describe('Variant recycling fields', () => {
    const RECYCLE_PROCESS_ID = 'proc_VRNT_RECYCLE_TEST__'

    beforeAll(async () => {
      const em = orm.em.fork()
      em.create(Process, {
        id: RECYCLE_PROCESS_ID,
        name: { en: 'Variant Recycle Process' },
        desc: { en: 'A process for testing variant recycle queries' },
        intent: ProcessIntent.RECYCLE,
        instructions: {},
        material: em.getReference(Material, MATERIAL_IDS[0]),
        region: em.getReference(Region, REGION_IDS[0]),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await em.flush()
    })

    test('should return recycle components for a variant', async () => {
      // VARIANT_IDS[0] includes COMPONENT_IDS[0] (primary material: MATERIAL_IDS[0])
      // The process matches MATERIAL_IDS[0] + REGION_IDS[0], so one entry is expected
      const res = await gql.send(
        graphql(`
          query VariantRecycles($id: ID!, $regionID: ID!) {
            variant(id: $id) {
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
        { id: VARIANT_IDS[0], regionID: REGION_IDS[0] },
      )
      expect(res.errors).toBeUndefined()
      const recycle = res.data?.variant?.recycle
      expect(recycle).toBeDefined()
      expect(recycle!.length).toBeGreaterThan(0)
      const first = recycle!.at(0)!
      expect(first.stream?.name).toBe('Variant Recycle Process')
      expect(first.components.totalCount).toBeGreaterThan(0)
      const nodeIds = first.components.nodes.map((n: { id: string }) => n.id)
      expect(nodeIds).toContain(COMPONENT_IDS[0])
    })

    test('should support pagination args on components field', async () => {
      const res = await gql.send(
        graphql(`
          query VariantRecycleComponentsPaginated($id: ID!, $regionID: ID!) {
            variant(id: $id) {
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
        { id: VARIANT_IDS[0], regionID: REGION_IDS[0] },
      )
      expect(res.errors).toBeUndefined()
      const recycle = res.data?.variant?.recycle
      expect(recycle?.length).toBeGreaterThan(0)
      const components = recycle!.at(0)!.components
      expect(components.nodes.length).toBeLessThanOrEqual(1)
      expect(components.totalCount).toBeGreaterThan(0)
    })

    test('should return the same stream data at variant level as at component level', async () => {
      const componentRes = await gql.send(
        graphql(`
          query VariantRecycleConsistencyComponent($id: ID!, $regionID: ID!) {
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
      const variantRes = await gql.send(
        graphql(`
          query VariantRecyclesConsistencyVariant($id: ID!, $regionID: ID!) {
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
      expect(componentRes.errors).toBeUndefined()
      expect(variantRes.errors).toBeUndefined()

      const componentStream = componentRes.data?.component?.recycle?.at(0)?.stream
      const variantStream = variantRes.data?.variant?.recycle?.at(0)?.stream
      expect(componentStream?.name).toBeDefined()
      expect(variantStream?.name).toBe(componentStream?.name)
      expect(variantStream?.desc).toBe(componentStream?.desc)
    })

    test('should return empty recycle when no region is provided', async () => {
      const res = await gql.send(
        graphql(`
          query VariantRecyclesNoRegion($id: ID!) {
            variant(id: $id) {
              recycle {
                stream {
                  name
                }
              }
            }
          }
        `),
        { id: VARIANT_IDS[0] },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.variant?.recycle).toHaveLength(0)
    })
  })
})
