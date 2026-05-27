import { MikroORM } from '@mikro-orm/postgresql'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import { graphql } from '@test/gql'
import { ChangeStatus } from '@test/gql/types.generated'
import { GraphQLTestClient } from '@test/graphql.utils'

import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { MATERIAL_IDS, TestMaterialSeeder } from '@src/db/seeds/TestMaterialSeeder'
import { REGION_IDS, TestProcessSeeder } from '@src/db/seeds/TestProcessSeeder'
import { TAG_IDS, TestTagSeeder } from '@src/db/seeds/TestTagSeeder'
import { COMPONENT_IDS, TestVariantSeeder } from '@src/db/seeds/TestVariantSeeder'
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
import { Tag, TagCaveatLevel, TagType } from '@src/process/tag.entity'
import { Org } from '@src/users/org.entity'
import { WindmillMockService } from '@src/windmill/windmill.mock.service'
import { WindmillService } from '@src/windmill/windmill.service'

describe('ComponentResolver (integration)', () => {
  let app: INestApplication
  let gql: GraphQLTestClient
  let orm: MikroORM
  let componentID: string

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
      TestMaterialSeeder,
      TestProcessSeeder,
      TestTagSeeder,
      TestVariantSeeder,
    )

    await gql.signIn('admin', 'password')

    componentID = COMPONENT_IDS[0]
  })

  afterAll(async () => {
    await app.close()
  })

  test('should query components with pagination', async () => {
    const res = await gql.send(
      graphql(`
        query ComponentResolverListComponents($first: Int) {
          components(first: $first) {
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
    expect(res.errors).toBeUndefined()
    expect(res.data?.components.nodes).toBeDefined()
    expect(res.data?.components.nodes?.length).toBeGreaterThan(0)
    expect(res.data?.components.totalCount).toBeGreaterThan(0)
  })

  test('should include initialized materials in components list query', async () => {
    // Regression: querying components with materials { material { id name } } threw
    // "Entity is not initialized: Material" because componentMaterials was populated
    // without its nested material relation, leaving MikroORM proxies unresolved.
    const res = await gql.send(
      graphql(`
        query ComponentResolverListComponentsWithMaterials(
          $first: Int
          $last: Int
          $after: String
          $before: String
        ) {
          components(first: $first, last: $last, after: $after, before: $before) {
            nodes {
              id
              name
              materials {
                material {
                  id
                  name
                }
                materialFraction
              }
            }
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
          }
        }
      `),
      { first: 20, last: null, after: null, before: null },
    )
    expect(res.errors).toBeUndefined()
    const nodes = res.data?.components.nodes
    expect(Array.isArray(nodes)).toBe(true)

    // At least one component in the seed data has materials; verify they are resolved
    const withMaterials = nodes?.filter((n) => n.materials.length > 0)
    expect(withMaterials?.length).toBeGreaterThan(0)
    for (const node of withMaterials ?? []) {
      for (const cm of node.materials) {
        expect(cm.material.id).toBeTruthy()
        expect(cm.material.name).toBeTruthy()
      }
    }
  })

  test('should filter components by material', async () => {
    const materialId = MATERIAL_IDS[0]
    const res = await gql.send(
      graphql(`
        query ComponentResolverFilterComponents($query: String) {
          components(query: $query) {
            nodes {
              id
              name
              primaryMaterial {
                id
              }
            }
            totalCount
          }
        }
      `),
      { query: `material:${materialId}` },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.components.nodes).toBeDefined()
    expect(res.data?.components.nodes?.length).toBeGreaterThan(0)
    for (const node of res.data?.components.nodes ?? []) {
      // Note: In the query result we only check primaryMaterial,
      // but the filter uses the ManyToMany relationship which includes it.
      expect(node.primaryMaterial.id).toBe(materialId)
    }
  })

  test('should filter components by multiple materials (pivot table)', async () => {
    // 1. Create a component with two materials
    const m1 = MATERIAL_IDS[0]
    const m2 = MATERIAL_IDS[1]
    const m3 = MATERIAL_IDS[2]

    const createRes1 = await gql.send(
      graphql(`
        mutation ComponentResolverCreateMultiMaterial1($input: CreateComponentInput!) {
          createComponent(input: $input) {
            component {
              id
            }
          }
        }
      `),
      {
        input: {
          name: 'Multi Material Component',
          primaryMaterial: { id: m1 },
          materials: [
            { id: m1, materialFraction: 0.5 },
            { id: m2, materialFraction: 0.5 },
          ],
        },
      },
    )
    expect(createRes1.errors).toBeUndefined()
    const componentId1 = createRes1.data?.createComponent?.component?.id
    expect(componentId1).toBeDefined()

    // 2. Create another component with a different material (m3)
    const createRes2 = await gql.send(
      graphql(`
        mutation ComponentResolverCreateMultiMaterial2($input: CreateComponentInput!) {
          createComponent(input: $input) {
            component {
              id
            }
          }
        }
      `),
      {
        input: {
          name: 'Other Material Component',
          primaryMaterial: { id: m3 },
          materials: [{ id: m3, materialFraction: 1.0 }],
        },
      },
    )
    expect(createRes2.errors).toBeUndefined()
    const componentId2 = createRes2.data?.createComponent?.component?.id
    expect(componentId2).toBeDefined()

    // 3. Query with both m1 AND m2
    const filterRes = await gql.send(
      graphql(`
        query ComponentResolverFilterMultiMaterial($query: String) {
          components(query: $query) {
            nodes {
              id
              name
            }
            totalCount
          }
        }
      `),
      { query: `material:${m1} AND material:${m2}` },
    )

    expect(filterRes.errors).toBeUndefined()
    const ids = filterRes.data?.components.nodes?.map((node) => node.id) ?? []

    // Component 1 should be present
    expect(ids).toContain(componentId1)
    // Component 2 should be filtered out
    expect(ids).not.toContain(componentId2)
  })

  test('should query a single component', async () => {
    const res = await gql.send(
      graphql(`
        query ComponentResolverGetComponent($id: ID!) {
          component(id: $id) {
            id
            name
          }
        }
      `),
      { id: componentID },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.component).toBeDefined()
    expect(res.data?.component?.id).toBe(componentID)
  })

  test('should query component schema', async () => {
    const res = await gql.send(
      graphql(`
        query ComponentResolverGetComponentSchema {
          componentSchema {
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
    expect(res.data?.componentSchema).toBeDefined()
    expect(res.data?.componentSchema?.create).toBeDefined()
    expect(res.data?.componentSchema?.update).toBeDefined()
  })

  test('should query component material', async () => {
    const res = await gql.send(
      graphql(`
        query ComponentResolverGetComponentMaterial($id: ID!) {
          component(id: $id) {
            id
            materials {
              material {
                id
                name
              }
            }
          }
        }
      `),
      { id: componentID },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.component).toBeDefined()
  })

  test('should query component tags', async () => {
    const res = await gql.send(
      graphql(`
        query ComponentResolverGetComponentTags($id: ID!) {
          component(id: $id) {
            id
            tags {
              nodes {
                id
                name
              }
            }
          }
        }
      `),
      { id: componentID },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.component).toBeDefined()
    expect(Array.isArray(res.data?.component?.tags?.nodes)).toBe(true)
  })

  test('should create a component', async () => {
    const res = await gql.send(
      graphql(`
        mutation ComponentResolverCreateComponent($input: CreateComponentInput!) {
          createComponent(input: $input) {
            component {
              id
              name
            }
          }
        }
      `),
      {
        input: {
          name: 'Test Component',
          primaryMaterial: {
            id: MATERIAL_IDS[0],
          },
        },
      },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.createComponent?.component).toBeDefined()
    expect(res.data?.createComponent?.component?.name).toBe('Test Component')
  })

  test('should update a component', async () => {
    const res = await gql.send(
      graphql(`
        mutation ComponentResolverUpdateComponent($input: UpdateComponentInput!) {
          updateComponent(input: $input) {
            component {
              id
              name
            }
          }
        }
      `),
      {
        input: {
          id: componentID,
          name: 'Updated Component Name',
        },
      },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.updateComponent?.component).toBeDefined()
    expect(res.data?.updateComponent?.component?.id).toBe(componentID)
    expect(res.data?.updateComponent?.component?.name).toBe('Updated Component Name')
  })

  test('should return error for non-existent component', async () => {
    const res = await gql.send(
      graphql(`
        query ComponentResolverGetNonExistentComponent($id: ID!) {
          component(id: $id) {
            id
          }
        }
      `),
      { id: 'non-existent-id' },
    )
    expect(res.errors).toBeTruthy()
    expect(res.errors?.[0].message).toContain('Component not found')
  })

  // Comprehensive Create Tests
  describe('CreateComponent comprehensive field tests', () => {
    test('should create component with all text fields and primary material', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateComponentAllFields($input: CreateComponentInput!) {
            createComponent(input: $input) {
              component {
                id
                name
                desc
                imageURL
                primaryMaterial {
                  id
                }
              }
            }
          }
        `),
        {
          input: {
            name: 'Comprehensive Test Component',
            desc: 'Detailed component description',
            imageURL: 'https://example.com/component.jpg',
            lang: 'en',
            primaryMaterial: { id: MATERIAL_IDS[0] },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createComponent?.component).toBeDefined()
      expect(res.data?.createComponent?.component?.name).toBe('Comprehensive Test Component')
      expect(res.data?.createComponent?.component?.desc).toBe('Detailed component description')
      expect(res.data?.createComponent?.component?.imageURL).toBe(
        'https://example.com/component.jpg',
      )
      expect(res.data?.createComponent?.component?.primaryMaterial?.id).toBe(MATERIAL_IDS[0])
    })

    test('should create component with translated fields', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateComponentTranslated($input: CreateComponentInput!) {
            createComponent(input: $input) {
              component {
                id
                name
              }
            }
          }
        `),
        {
          input: {
            nameTr: [
              { lang: 'en', text: 'English Component' },
              { lang: 'sv', text: 'Svenska Komponent' },
            ],
            descTr: [
              { lang: 'en', text: 'English Comp Description' },
              { lang: 'sv', text: 'Svenska Beskrivning' },
            ],
            primaryMaterial: { id: MATERIAL_IDS[0] },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createComponent?.component).toBeDefined()
    })

    test('should create component with materials and physical data', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateComponentWithMaterials($input: CreateComponentInput!) {
            createComponent(input: $input) {
              component {
                id
                name
              }
            }
          }
        `),
        {
          input: {
            name: 'Component with Materials',
            primaryMaterial: { id: MATERIAL_IDS[0] },
            materials: [
              { id: MATERIAL_IDS[0], materialFraction: 0.7 },
              { id: MATERIAL_IDS[1], materialFraction: 0.3 },
            ],
            physical: { weight: 100, unit: 'g' },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createComponent?.component).toBeDefined()
      expect(res.data?.createComponent?.component?.name).toBe('Component with Materials')
    })

    test('should create component with tags', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateComponentWithTags($input: CreateComponentInput!) {
            createComponent(input: $input) {
              component {
                id
                tags {
                  nodes {
                    id
                  }
                }
              }
            }
          }
        `),
        {
          input: {
            name: 'Component with Tags',
            primaryMaterial: { id: MATERIAL_IDS[0] },
            tags: [
              { id: TAG_IDS[0], meta: { score: 95 } },
              { id: TAG_IDS[3], meta: { level: 'low' } },
            ],
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createComponent?.component).toBeDefined()
      expect(res.data?.createComponent?.component?.tags?.nodes).toHaveLength(2)
      expect(res.data?.createComponent?.component?.tags?.nodes?.map((t: any) => t.id)).toContain(
        TAG_IDS[0],
      )
      expect(res.data?.createComponent?.component?.tags?.nodes?.map((t: any) => t.id)).toContain(
        TAG_IDS[3],
      )
    })

    test('should create component with region', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateComponentWithRegion($input: CreateComponentInput!) {
            createComponent(input: $input) {
              component {
                id
                region {
                  id
                }
              }
            }
          }
        `),
        {
          input: {
            name: 'Component with Region',
            primaryMaterial: { id: MATERIAL_IDS[0] },
            region: { id: REGION_IDS[0] },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createComponent?.component).toBeDefined()
      expect(res.data?.createComponent?.component?.region?.id).toBe(REGION_IDS[0])
    })

    test('should create component with change tracking', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateComponentWithChange($input: CreateComponentInput!) {
            createComponent(input: $input) {
              component {
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
            name: 'Component with Change',
            primaryMaterial: { id: MATERIAL_IDS[0] },
            change: {
              title: 'Add new component',
              status: ChangeStatus.Draft,
            },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createComponent?.component).toBeDefined()
      expect(res.data?.createComponent?.change).toBeDefined()
      expect(res.data?.createComponent?.change?.status).toBe('DRAFT')
    })
  })

  // Comprehensive Update Tests
  describe('UpdateComponent comprehensive field tests', () => {
    let testComponentID: string

    beforeAll(async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateComponentForUpdate($input: CreateComponentInput!) {
            createComponent(input: $input) {
              component {
                id
              }
            }
          }
        `),
        {
          input: {
            name: 'Component for Updates',
            primaryMaterial: { id: MATERIAL_IDS[0] },
          },
        },
      )
      if (res.data?.createComponent?.component?.id) {
        testComponentID = res.data?.createComponent?.component?.id
      } else {
        throw new Error('Failed to create component for update tests')
      }
    })

    test('should update component text fields', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateComponentText($input: UpdateComponentInput!) {
            updateComponent(input: $input) {
              component {
                id
                name
                desc
              }
            }
          }
        `),
        {
          input: {
            id: testComponentID,
            name: 'Updated Component Name',
            desc: 'Updated Description',
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateComponent?.component).toBeDefined()
      expect(res.data?.updateComponent?.component?.id).toBe(testComponentID)
      expect(res.data?.updateComponent?.component?.name).toBe('Updated Component Name')
      expect(res.data?.updateComponent?.component?.desc).toBe('Updated Description')
    })

    test('should update component materials', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateComponentMaterials($input: UpdateComponentInput!) {
            updateComponent(input: $input) {
              component {
                id
                name
              }
            }
          }
        `),
        {
          input: {
            id: testComponentID,
            materials: [{ id: MATERIAL_IDS[1], materialFraction: 0.5 }],
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateComponent?.component).toBeDefined()
      expect(res.data?.updateComponent?.component?.id).toBe(testComponentID)
    })

    test('should add and remove tags', async () => {
      // Add tags
      const addRes = await gql.send(
        graphql(`
          mutation UpdateComponentAddTags($input: UpdateComponentInput!) {
            updateComponent(input: $input) {
              component {
                id
                tags {
                  nodes {
                    id
                  }
                }
              }
            }
          }
        `),
        {
          input: {
            id: testComponentID,
            addTags: [{ id: TAG_IDS[0], meta: { score: 80 } }],
          },
        },
      )
      expect(addRes.errors).toBeUndefined()
      expect(addRes.data?.updateComponent?.component).toBeDefined()
      expect(addRes.data?.updateComponent?.component?.tags?.nodes).toHaveLength(1)
      expect(addRes.data?.updateComponent?.component?.tags?.nodes?.map((t: any) => t.id)).toContain(
        TAG_IDS[0],
      )

      // Remove tags
      const removeRes = await gql.send(
        graphql(`
          mutation UpdateComponentRemoveTags($input: UpdateComponentInput!) {
            updateComponent(input: $input) {
              component {
                id
              }
            }
          }
        `),
        {
          input: {
            id: testComponentID,
            removeTags: [TAG_IDS[0]],
          },
        },
      )
      expect(removeRes.errors).toBeUndefined()
      expect(removeRes.data?.updateComponent?.component).toBeDefined()
      expect(removeRes.data?.updateComponent?.component?.id).toBe(testComponentID)
    })

    test('should update component with change tracking', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateComponentWithChange($input: UpdateComponentInput!) {
            updateComponent(input: $input) {
              component {
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
            id: testComponentID,
            name: 'Updated via Change',
            change: {
              title: 'Update component',
              status: ChangeStatus.Proposed,
            },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateComponent?.component).toBeDefined()
      expect(res.data?.updateComponent?.component?.id).toBe(testComponentID)
      expect(res.data?.updateComponent?.change).toBeDefined()
      expect(res.data?.updateComponent?.change?.status).toBe('PROPOSED')
    })

    test('should return currentComponent with DB state when using change tracking', async () => {
      // First set a known name directly in the DB
      const directRes = await gql.send(
        graphql(`
          mutation ComponentSetCurrentName($input: UpdateComponentInput!) {
            updateComponent(input: $input) {
              component {
                id
                name
              }
            }
          }
        `),
        { input: { id: testComponentID, name: 'Current DB Name' } },
      )
      expect(directRes.errors).toBeUndefined()

      // Now update via change — component should show proposed, currentComponent the DB value
      const changeRes = await gql.send(
        graphql(`
          mutation UpdateComponentWithChangeCurrentComponent($input: UpdateComponentInput!) {
            updateComponent(input: $input) {
              component {
                id
                name
              }
              currentComponent {
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
            id: testComponentID,
            name: 'Proposed Name',
            change: { title: 'current component test' },
          },
        },
      )
      expect(changeRes.errors).toBeUndefined()
      expect(changeRes.data?.updateComponent?.component?.name).toBe('Proposed Name')
      expect(changeRes.data?.updateComponent?.currentComponent?.name).toBe('Current DB Name')
      expect(changeRes.data?.updateComponent?.currentComponent?.id).toBe(testComponentID)
    })

    test('should keep currentComponent region isolated while staging a new region in a change', async () => {
      const directRes = await gql.send(
        graphql(`
          mutation ComponentSetCurrentRefs($input: UpdateComponentInput!) {
            updateComponent(input: $input) {
              component {
                id
              }
            }
          }
        `),
        {
          input: {
            id: testComponentID,
            region: { id: REGION_IDS[0] },
          },
        },
      )
      expect(directRes.errors).toBeUndefined()

      const changeRes = await gql.send(
        graphql(`
          mutation UpdateComponentCurrentRefs($input: UpdateComponentInput!) {
            updateComponent(input: $input) {
              component {
                id
                region {
                  id
                }
              }
              currentComponent {
                id
                region {
                  id
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
            id: testComponentID,
            region: { id: REGION_IDS[1] },
            change: { title: 'current component refs' },
          },
        },
      )

      expect(changeRes.errors).toBeUndefined()
      expect(changeRes.data?.updateComponent?.component?.region?.id).toBe(REGION_IDS[1])
      expect(changeRes.data?.updateComponent?.currentComponent?.region?.id).toBe(REGION_IDS[0])
    })
  })

  describe('reduce and reuse fields', () => {
    // One REDUCE process and five reuse-group processes, all via material_id association
    const IDS = {
      REDUCE: '9iOFBSh1EldfJt7RFnzQJ',
      REPAIR: 'jCPuFo05jiQIQPjUqGy8L',
      REFURB: 'LDiVgnewlHdClq9dPASL3',
      REMANUF: 'nrrX6Axr08vQ3Xk2oCmyH',
      REPURP: 'XpxQ8R0q4C5wT7Tid8osj',
      REUSE: 'W4tbQn6ezQdGiN1hyS5J9',
    }

    beforeAll(async () => {
      const em = orm.em.fork()
      const baseFields = {
        instructions: {},
        material: em.getReference(Material, MATERIAL_IDS[0]),
        region: em.getReference(Region, REGION_IDS[0]),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      em.create(Process, {
        id: IDS.REDUCE,
        name: { en: 'C Reduce' },
        intent: ProcessIntent.REDUCE,
        ...baseFields,
      })
      em.create(Process, {
        id: IDS.REPAIR,
        name: { en: 'C Repair' },
        intent: ProcessIntent.REPAIR,
        ...baseFields,
      })
      em.create(Process, {
        id: IDS.REFURB,
        name: { en: 'C Refurb' },
        intent: ProcessIntent.REFURBISH,
        ...baseFields,
      })
      em.create(Process, {
        id: IDS.REMANUF,
        name: { en: 'C Remanuf' },
        intent: ProcessIntent.REMANUFACTURE,
        ...baseFields,
      })
      em.create(Process, {
        id: IDS.REPURP,
        name: { en: 'C Repurpose' },
        intent: ProcessIntent.REPURPOSE,
        ...baseFields,
      })
      em.create(Process, {
        id: IDS.REUSE,
        name: { en: 'C Reuse' },
        intent: ProcessIntent.REUSE,
        ...baseFields,
      })
      await em.flush()
    })

    test('should return the single REDUCE process in reduce()', async () => {
      const res = await gql.send(
        graphql(`
          query ComponentReduce($id: ID!, $regionID: ID!) {
            component(id: $id) {
              reduce(regionID: $regionID) {
                stream {
                  name
                }
              }
            }
          }
        `),
        { id: componentID, regionID: REGION_IDS[0] },
      )
      expect(res.errors).toBeUndefined()
      const names = res.data?.component?.reduce?.map((r) => r.stream?.name) ?? []
      expect(names).toContain('C Reduce')
      // Must not contain any reuse-group intents
      expect(names).not.toContain('C Repair')
      expect(names).not.toContain('C Reuse')
    })

    test('should return all five reuse-group intents in reuse()', async () => {
      const res = await gql.send(
        graphql(`
          query ComponentReuse($id: ID!, $regionID: ID!) {
            component(id: $id) {
              reuse(regionID: $regionID) {
                stream {
                  name
                }
              }
            }
          }
        `),
        { id: componentID, regionID: REGION_IDS[0] },
      )
      expect(res.errors).toBeUndefined()
      const names = res.data?.component?.reuse?.map((r) => r.stream?.name) ?? []
      expect(names).toContain('C Repair')
      expect(names).toContain('C Refurb')
      expect(names).toContain('C Remanuf')
      expect(names).toContain('C Repurpose')
      expect(names).toContain('C Reuse')
      // REDUCE must not appear in reuse()
      expect(names).not.toContain('C Reduce')
    })

    test('should not return reduce or reuse processes in recycle()', async () => {
      const res = await gql.send(
        graphql(`
          query ComponentRecycleIsolation($id: ID!, $regionID: ID!) {
            component(id: $id) {
              recycle(regionID: $regionID) {
                stream {
                  name
                }
              }
            }
          }
        `),
        { id: componentID, regionID: REGION_IDS[0] },
      )
      expect(res.errors).toBeUndefined()
      const names = res.data?.component?.recycle?.map((r) => r.stream?.name) ?? []
      for (const n of ['C Reduce', 'C Repair', 'C Refurb', 'C Remanuf', 'C Repurpose', 'C Reuse']) {
        expect(names).not.toContain(n)
      }
    })

    test('should return empty reduce when no region is provided', async () => {
      const res = await gql.send(
        graphql(`
          query ComponentReduceNoRegion($id: ID!) {
            component(id: $id) {
              reduce {
                stream {
                  name
                }
              }
            }
          }
        `),
        { id: componentID },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.component?.reduce).toHaveLength(0)
    })

    test('should return empty reuse when no region is provided', async () => {
      const res = await gql.send(
        graphql(`
          query ComponentReuseNoRegion($id: ID!) {
            component(id: $id) {
              reuse {
                stream {
                  name
                }
              }
            }
          }
        `),
        { id: componentID },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.component?.reuse).toHaveLength(0)
    })
  })

  describe('recycle caveats from tag rules', () => {
    let caveatsComponentId: string
    const CAVEAT_TAG_ID = 'tagX_CAVEAT_TESTTAG___'
    const CAVEAT_PROCESS_ID = 'procX_CAVEAT_PROCESS__'

    beforeAll(async () => {
      const em = orm.em.fork()

      em.create(Tag, {
        id: CAVEAT_TAG_ID,
        name: { en: 'Caveat Tag' },
        type: TagType.COMPONENT,
        rules: {
          recycle: [
            {
              caveat: {
                level: TagCaveatLevel.HIGH,
                name: { en: 'Handle with care' },
                desc: { en: 'Requires careful handling' },
              },
            },
          ],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      em.create(Process, {
        id: CAVEAT_PROCESS_ID,
        name: { en: 'Caveat Process' },
        intent: ProcessIntent.RECYCLE,
        instructions: {},
        material: em.getReference(Material, MATERIAL_IDS[0]),
        region: em.getReference(Region, REGION_IDS[0]),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await em.flush()

      const res = await gql.send(
        graphql(`
          mutation CreateCaveatComponent($input: CreateComponentInput!) {
            createComponent(input: $input) {
              component {
                id
              }
            }
          }
        `),
        {
          input: {
            name: 'Caveat Test Component',
            primaryMaterial: { id: MATERIAL_IDS[0] },
            tags: [{ id: CAVEAT_TAG_ID }],
          },
        },
      )
      caveatsComponentId = res.data!.createComponent!.component!.id
    })

    test('should return caveats from tag rules when recycling', async () => {
      const res = await gql.send(
        graphql(`
          query ComponentRecycleCaveats($id: ID!, $regionID: ID!) {
            component(id: $id) {
              recycle(regionID: $regionID) {
                stream {
                  caveats {
                    level
                    name
                    desc
                  }
                }
              }
            }
          }
        `),
        { id: caveatsComponentId, regionID: REGION_IDS[0] },
      )

      expect(res.errors).toBeUndefined()
      const recycle = res.data?.component?.recycle
      expect(recycle).toHaveLength(1)
      const caveats = recycle![0]?.stream?.caveats
      expect(caveats).toHaveLength(1)
      expect(caveats![0].level).toBe('HIGH')
      expect(caveats![0].name).toBe('Handle with care')
      expect(caveats![0].desc).toBe('Requires careful handling')
    })
  })

  describe('history tracking', () => {
    let historyComponentID: string

    test('should record history on direct create', async () => {
      const createRes = await gql.send(
        graphql(`
          mutation ComponentHistoryCreate($input: CreateComponentInput!) {
            createComponent(input: $input) {
              component {
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
        { input: { name: 'History Test Component', primaryMaterial: { id: MATERIAL_IDS[0] } } },
      )
      expect(createRes.errors).toBeUndefined()
      const component = createRes.data?.createComponent?.component
      expect(component).toBeDefined()
      historyComponentID = component!.id
      expect(component!.history.nodes).toHaveLength(1)
      expect(component!.history.nodes![0].user).toBeDefined()
      expect(component!.history.nodes![0].original).toBeNull()
      expect(component!.history.nodes![0].changes).toBeTruthy()
    })

    test('should record history on direct update', async () => {
      const updateRes = await gql.send(
        graphql(`
          mutation ComponentHistoryUpdate($input: UpdateComponentInput!) {
            updateComponent(input: $input) {
              component {
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
        { input: { id: historyComponentID, name: 'Updated History Component' } },
      )
      expect(updateRes.errors).toBeUndefined()
      const component = updateRes.data?.updateComponent?.component
      expect(component).toBeDefined()
      expect(component!.history.nodes).toHaveLength(2)
      const latest = component!.history.nodes!.at(-1)!
      expect(latest.original).toBeTruthy()
      expect(latest.changes).toBeTruthy()
    })
  })

  describe('programs() on stream types', () => {
    const IDS = {
      PROCESS_RECYCLE: 'F7KLOgmfwpKxMOIHL5Np3',
      PROCESS_REDUCE: 'RCrhnWFWGgu4co-69Soe7',
      PROCESS_REUSE: 'FvEIrnMeLxy2-BEA4rOhL',
      PROGRAM_A: '3ddxuirQhyyLRXBeDQr1E',
      PROGRAM_B: 'OuXXLbHHu3Vr8lYLchZhy',
      ORG_A: 'PMC4xjXZGrxSeCzH1lb1x',
      ORG_B: 'BBK5S8mfgETIXtzdK2hKe',
    }

    beforeAll(async () => {
      const em = orm.em.fork()
      const region = em.getReference(Region, REGION_IDS[0])
      const material = em.getReference(Material, MATERIAL_IDS[0])

      em.create(Org, {
        id: IDS.ORG_A,
        name: 'Stream Org A',
        slug: 'stream-org-a',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      em.create(Org, {
        id: IDS.ORG_B,
        name: 'Stream Org B',
        slug: 'stream-org-b',
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
        name: { en: 'PgStr Recycle' },
        intent: ProcessIntent.RECYCLE,
        ...baseFields,
      })
      em.create(Process, {
        id: IDS.PROCESS_REDUCE,
        name: { en: 'PgStr Reduce' },
        intent: ProcessIntent.REDUCE,
        ...baseFields,
      })
      em.create(Process, {
        id: IDS.PROCESS_REUSE,
        name: { en: 'PgStr Reuse' },
        intent: ProcessIntent.REUSE,
        ...baseFields,
      })
      await em.flush()

      em.create(Program, {
        id: IDS.PROGRAM_A,
        name: { en: 'Stream Program Alpha' },
        status: ProgramStatus.ACTIVE,
        instructions: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      em.create(Program, {
        id: IDS.PROGRAM_B,
        name: { en: 'Stream Program Beta' },
        status: ProgramStatus.ACTIVE,
        instructions: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await em.flush()

      // Link processes to programs
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
      // Program A has two orgs — should produce 2 rows for recycle stream
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

    test('recycle stream programs() returns one row per org in the program', async () => {
      const res = await gql.send(
        graphql(`
          query ComponentRecyclePrograms($id: ID!, $regionID: ID!) {
            component(id: $id) {
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
        { id: componentID, regionID: REGION_IDS[0] },
      )
      expect(res.errors).toBeUndefined()
      const recycleResults = res.data?.component?.recycle ?? []
      const pgStrRecycle = recycleResults.find((r) => r.stream?.name === 'PgStr Recycle')
      expect(pgStrRecycle).toBeDefined()
      const nodes = pgStrRecycle!.stream!.programs.nodes
      // Program A has 2 orgs → 2 rows
      expect(nodes).toHaveLength(2)
      expect(nodes.map((n) => n.program.name)).toEqual([
        'Stream Program Alpha',
        'Stream Program Alpha',
      ])
      const orgNames = nodes.map((n) => n.org?.name).sort()
      expect(orgNames).toEqual(['Stream Org A', 'Stream Org B'])
    })

    test('reduce stream programs() returns correct programs', async () => {
      const res = await gql.send(
        graphql(`
          query ComponentReducePrograms($id: ID!, $regionID: ID!) {
            component(id: $id) {
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
        { id: componentID, regionID: REGION_IDS[0] },
      )
      expect(res.errors).toBeUndefined()
      const reduceResults = res.data?.component?.reduce ?? []
      const pgStrReduce = reduceResults.find((r) => r.stream?.name === 'PgStr Reduce')
      expect(pgStrReduce).toBeDefined()
      const nodes = pgStrReduce!.stream!.programs.nodes
      expect(nodes.map((n) => n.program.name)).toContain('Stream Program Alpha')
    })

    test('reuse stream programs() returns correct programs', async () => {
      const res = await gql.send(
        graphql(`
          query ComponentReusePrograms($id: ID!, $regionID: ID!) {
            component(id: $id) {
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
        { id: componentID, regionID: REGION_IDS[0] },
      )
      expect(res.errors).toBeUndefined()
      const reuseResults = res.data?.component?.reuse ?? []
      const pgStrReuse = reuseResults.find((r) => r.stream?.name === 'PgStr Reuse')
      expect(pgStrReuse).toBeDefined()
      const nodes = pgStrReuse!.stream!.programs.nodes
      expect(nodes.map((n) => n.program.name)).toContain('Stream Program Beta')
    })

    test('programs(query) filters by program name', async () => {
      const res = await gql.send(
        graphql(`
          query ComponentRecycleProgramsFilter($id: ID!, $regionID: ID!) {
            component(id: $id) {
              recycle(regionID: $regionID) {
                stream {
                  name
                  programs(query: "Alpha") {
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
        { id: componentID, regionID: REGION_IDS[0] },
      )
      expect(res.errors).toBeUndefined()
      const recycleResults = res.data?.component?.recycle ?? []
      const pgStrRecycle = recycleResults.find((r) => r.stream?.name === 'PgStr Recycle')
      expect(pgStrRecycle).toBeDefined()
      // "Alpha" matches "Stream Program Alpha" but not "Stream Program Beta"
      const nodes = pgStrRecycle!.stream!.programs.nodes
      expect(nodes.length).toBeGreaterThan(0)
      for (const n of nodes) {
        expect(n.program.name).toContain('Alpha')
      }
    })
  })
})
