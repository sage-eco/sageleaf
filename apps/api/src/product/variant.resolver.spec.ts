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
import {
  Program,
  ProgramsOrgs,
  ProgramsProcesses,
  ProgramStatus,
} from '@src/process/program.entity'
import { Variant as VariantEntity } from '@src/product/variant.entity'
import { Org } from '@src/users/org.entity'

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

  describe('Variant reduce and reuse fields', () => {
    // Two REDUCE processes (one via material_id, one via variant_id) and
    // multiple reuse-group processes across both associations
    const IDS = {
      REDUCE_MAT: 'UDvaADxUoJ4tPNpTsYKym',
      REDUCE_VRT: 'jXNaim2W9Yin9JSBGpuNq',
      REPAIR_MAT: '0lCEtE7TvCfwnenjgwzSm',
      REFURB_VRT: 'LHnOgg3GEBhX4QXdpDCGx',
      REPURP_VRT: 'tUH45ss054LUIf9I9fuFt',
      REUSE_MAT: 'R4QmY73qkJmmcH50UtOIn',
    }

    beforeAll(async () => {
      const em = orm.em.fork()
      const base = {
        instructions: {},
        region: em.getReference(Region, REGION_IDS[0]),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      // REDUCE via material_id and variant_id
      em.create(Process, {
        id: IDS.REDUCE_MAT,
        name: { en: 'V Reduce Mat' },
        intent: ProcessIntent.REDUCE,
        material: em.getReference(Material, MATERIAL_IDS[0]),
        ...base,
      })
      em.create(Process, {
        id: IDS.REDUCE_VRT,
        name: { en: 'V Reduce Vrt' },
        intent: ProcessIntent.REDUCE,
        variant: em.getReference(VariantEntity, VARIANT_IDS[0]),
        ...base,
      })
      // REUSE group via material_id (REPAIR, REUSE) and variant_id (REFURBISH, REPURPOSE)
      em.create(Process, {
        id: IDS.REPAIR_MAT,
        name: { en: 'V Repair Mat' },
        intent: ProcessIntent.REPAIR,
        material: em.getReference(Material, MATERIAL_IDS[0]),
        ...base,
      })
      em.create(Process, {
        id: IDS.REFURB_VRT,
        name: { en: 'V Refurb Vrt' },
        intent: ProcessIntent.REFURBISH,
        variant: em.getReference(VariantEntity, VARIANT_IDS[0]),
        ...base,
      })
      em.create(Process, {
        id: IDS.REPURP_VRT,
        name: { en: 'V Repurpose Vrt' },
        intent: ProcessIntent.REPURPOSE,
        variant: em.getReference(VariantEntity, VARIANT_IDS[0]),
        ...base,
      })
      em.create(Process, {
        id: IDS.REUSE_MAT,
        name: { en: 'V Reuse Mat' },
        intent: ProcessIntent.REUSE,
        material: em.getReference(Material, MATERIAL_IDS[0]),
        ...base,
      })
      await em.flush()
    })

    test('should return reduce entries from both material_id and variant_id associations', async () => {
      const res = await gql.send(
        graphql(`
          query VariantReduce($id: ID!, $regionID: ID!) {
            variant(id: $id) {
              reduce(regionID: $regionID) {
                stream {
                  name
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
      const reduce = res.data?.variant?.reduce ?? []
      const names = reduce.map((r) => r.stream?.name)
      // Both material-based and variant-based REDUCE processes appear
      expect(names).toContain('V Reduce Mat')
      expect(names).toContain('V Reduce Vrt')
      // Variant-based process has all components of the variant
      const vrtEntry = reduce.find((r) => r.stream?.name === 'V Reduce Vrt')!
      expect(vrtEntry.components.totalCount).toBeGreaterThan(0)
      expect(vrtEntry.components.nodes.map((n: { id: string }) => n.id)).toContain(COMPONENT_IDS[0])
      // Material-based process is tied to the component with that material
      const matEntry = reduce.find((r) => r.stream?.name === 'V Reduce Mat')!
      expect(matEntry.components.nodes.map((n: { id: string }) => n.id)).toContain(COMPONENT_IDS[0])
    })

    test('should return reuse entries from both material_id and variant_id associations', async () => {
      const res = await gql.send(
        graphql(`
          query VariantReuse($id: ID!, $regionID: ID!) {
            variant(id: $id) {
              reuse(regionID: $regionID) {
                stream {
                  name
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
      const reuse = res.data?.variant?.reuse ?? []
      const names = reuse.map((r) => r.stream?.name)
      // All four reuse-group processes appear
      expect(names).toContain('V Repair Mat')
      expect(names).toContain('V Refurb Vrt')
      expect(names).toContain('V Repurpose Vrt')
      expect(names).toContain('V Reuse Mat')
      // REDUCE must not bleed into reuse()
      expect(names).not.toContain('V Reduce Mat')
      expect(names).not.toContain('V Reduce Vrt')
      // Variant-based reuse entries cover all components
      const refurbEntry = reuse.find((r) => r.stream?.name === 'V Refurb Vrt')!
      expect(refurbEntry.components.totalCount).toBeGreaterThan(0)
      expect(refurbEntry.components.nodes.map((n: { id: string }) => n.id)).toContain(
        COMPONENT_IDS[0],
      )
    })

    test('should not return reduce or reuse processes in recycle()', async () => {
      const res = await gql.send(
        graphql(`
          query VariantRecycleIsolation($id: ID!, $regionID: ID!) {
            variant(id: $id) {
              recycle(regionID: $regionID) {
                stream {
                  name
                }
              }
            }
          }
        `),
        { id: VARIANT_IDS[0], regionID: REGION_IDS[0] },
      )
      expect(res.errors).toBeUndefined()
      const names = res.data?.variant?.recycle?.map((r) => r.stream?.name) ?? []
      for (const n of [
        'V Reduce Mat',
        'V Reduce Vrt',
        'V Repair Mat',
        'V Refurb Vrt',
        'V Repurpose Vrt',
        'V Reuse Mat',
      ]) {
        expect(names).not.toContain(n)
      }
    })

    test('should support pagination on reduce components field', async () => {
      const res = await gql.send(
        graphql(`
          query VariantReduceComponentsPaginated($id: ID!, $regionID: ID!) {
            variant(id: $id) {
              reduce(regionID: $regionID) {
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
      const reduce = res.data?.variant?.reduce ?? []
      expect(reduce.length).toBeGreaterThan(0)
      for (const entry of reduce) {
        expect(entry.components.nodes.length).toBeLessThanOrEqual(1)
        expect(entry.components.totalCount).toBeGreaterThan(0)
      }
    })

    test('should return empty reduce when no region is provided', async () => {
      const res = await gql.send(
        graphql(`
          query VariantReduceNoRegion($id: ID!) {
            variant(id: $id) {
              reduce {
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
      expect(res.data?.variant?.reduce).toHaveLength(0)
    })

    test('should return empty reuse when no region is provided', async () => {
      const res = await gql.send(
        graphql(`
          query VariantReuseNoRegion($id: ID!) {
            variant(id: $id) {
              reuse {
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
      expect(res.data?.variant?.reuse).toHaveLength(0)
    })
  })

  describe('programs() on variant stream types', () => {
    const IDS = {
      PROCESS_RECYCLE: 'y1qqmTDyT692cdYY-bpvr',
      PROCESS_REDUCE: 'AjvewwLbNsbdvP2EpQnp0',
      PROCESS_REUSE: 'LIWz4RA0b_QTTlAy8Rzvf',
      PROGRAM_A: 'G6Cn7_zQMuhZyxu5MmV3o',
      PROGRAM_B: 'xLVHP64-CfHZIS1Az-QkY',
      ORG_A: 'crBSqMRbuHWSuOs7Aaa5N',
      ORG_B: '-FhXgxB9iVVJGCC2FA9RL',
    }

    beforeAll(async () => {
      const em = orm.em.fork()
      const region = em.getReference(Region, REGION_IDS[0])
      const material = em.getReference(Material, MATERIAL_IDS[0])

      em.create(Org, {
        id: IDS.ORG_A,
        name: 'Variant Stream Org A',
        slug: 'variant-stream-org-a',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      em.create(Org, {
        id: IDS.ORG_B,
        name: 'Variant Stream Org B',
        slug: 'variant-stream-org-b',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await em.flush()

      const baseFields = {
        instructions: {},
        material,
        region,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      em.create(Process, {
        id: IDS.PROCESS_RECYCLE,
        name: { en: 'VPgStr Recycle' },
        intent: ProcessIntent.RECYCLE,
        ...baseFields,
      })
      em.create(Process, {
        id: IDS.PROCESS_REDUCE,
        name: { en: 'VPgStr Reduce' },
        intent: ProcessIntent.REDUCE,
        ...baseFields,
      })
      em.create(Process, {
        id: IDS.PROCESS_REUSE,
        name: { en: 'VPgStr Reuse' },
        intent: ProcessIntent.REUSE,
        ...baseFields,
      })
      await em.flush()

      em.create(Program, {
        id: IDS.PROGRAM_A,
        name: { en: 'Variant Program Alpha' },
        status: ProgramStatus.ACTIVE,
        instructions: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      em.create(Program, {
        id: IDS.PROGRAM_B,
        name: { en: 'Variant Program Beta' },
        status: ProgramStatus.ACTIVE,
        instructions: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await em.flush()

      em.create(ProgramsProcesses, {
        program: em.getReference(Program, IDS.PROGRAM_A),
        process: em.getReference(Process, IDS.PROCESS_RECYCLE),
      })
      em.create(ProgramsProcesses, {
        program: em.getReference(Program, IDS.PROGRAM_A),
        process: em.getReference(Process, IDS.PROCESS_REDUCE),
      })
      em.create(ProgramsProcesses, {
        program: em.getReference(Program, IDS.PROGRAM_B),
        process: em.getReference(Process, IDS.PROCESS_REUSE),
      })
      em.create(ProgramsOrgs, {
        program: em.getReference(Program, IDS.PROGRAM_A),
        org: em.getReference(Org, IDS.ORG_A),
        role: 'operator',
      })
      em.create(ProgramsOrgs, {
        program: em.getReference(Program, IDS.PROGRAM_A),
        org: em.getReference(Org, IDS.ORG_B),
        role: 'supporter',
      })
      await em.flush()
    })

    test('variant recycle stream programs() returns one row per org', async () => {
      const res = await gql.send(
        graphql(`
          query VariantRecyclePrograms($id: ID!, $regionID: ID!) {
            variant(id: $id) {
              recycle(regionID: $regionID) {
                stream {
                  name
                  programs {
                    nodes {
                      program {
                        name
                      }
                      org {
                        name
                      }
                    }
                    totalCount
                  }
                }
              }
            }
          }
        `),
        { id: VARIANT_IDS[0], regionID: REGION_IDS[0] },
      )
      expect(res.errors).toBeUndefined()
      const recycleResults = res.data?.variant?.recycle ?? []
      const vpgStr = recycleResults.find((r) => r.stream?.name === 'VPgStr Recycle')
      expect(vpgStr).toBeDefined()
      const nodes = vpgStr!.stream!.programs.nodes
      expect(nodes).toHaveLength(2)
      const orgNames = nodes.map((n) => n.org?.name).sort()
      expect(orgNames).toEqual(['Variant Stream Org A', 'Variant Stream Org B'])
    })

    test('variant reduce stream programs() returns correct programs', async () => {
      const res = await gql.send(
        graphql(`
          query VariantReducePrograms($id: ID!, $regionID: ID!) {
            variant(id: $id) {
              reduce(regionID: $regionID) {
                stream {
                  name
                  programs {
                    nodes {
                      program {
                        name
                      }
                    }
                    totalCount
                  }
                }
              }
            }
          }
        `),
        { id: VARIANT_IDS[0], regionID: REGION_IDS[0] },
      )
      expect(res.errors).toBeUndefined()
      const reduceResults = res.data?.variant?.reduce ?? []
      const vpgStr = reduceResults.find((r) => r.stream?.name === 'VPgStr Reduce')
      expect(vpgStr).toBeDefined()
      expect(vpgStr!.stream!.programs.nodes.map((n) => n.program.name)).toContain(
        'Variant Program Alpha',
      )
    })

    test('variant reuse stream programs() returns correct programs', async () => {
      const res = await gql.send(
        graphql(`
          query VariantReusePrograms($id: ID!, $regionID: ID!) {
            variant(id: $id) {
              reuse(regionID: $regionID) {
                stream {
                  name
                  programs {
                    nodes {
                      program {
                        name
                      }
                    }
                    totalCount
                  }
                }
              }
            }
          }
        `),
        { id: VARIANT_IDS[0], regionID: REGION_IDS[0] },
      )
      expect(res.errors).toBeUndefined()
      const reuseResults = res.data?.variant?.reuse ?? []
      const vpgStr = reuseResults.find((r) => r.stream?.name === 'VPgStr Reuse')
      expect(vpgStr).toBeDefined()
      expect(vpgStr!.stream!.programs.nodes.map((n) => n.program.name)).toContain(
        'Variant Program Beta',
      )
    })

    test('programs(query) filter works on variant recycle stream', async () => {
      const res = await gql.send(
        graphql(`
          query VariantRecycleProgramsFilter($id: ID!, $regionID: ID!) {
            variant(id: $id) {
              recycle(regionID: $regionID) {
                stream {
                  name
                  programs(query: "Alpha") {
                    nodes {
                      program {
                        name
                      }
                    }
                  }
                }
              }
            }
          }
        `),
        { id: VARIANT_IDS[0], regionID: REGION_IDS[0] },
      )
      expect(res.errors).toBeUndefined()
      const recycleResults = res.data?.variant?.recycle ?? []
      const vpgStr = recycleResults.find((r) => r.stream?.name === 'VPgStr Recycle')
      expect(vpgStr).toBeDefined()
      const nodes = vpgStr!.stream!.programs.nodes
      expect(nodes.length).toBeGreaterThan(0)
      for (const n of nodes) {
        expect(n.program.name).toContain('Alpha')
      }
    })
  })
})
