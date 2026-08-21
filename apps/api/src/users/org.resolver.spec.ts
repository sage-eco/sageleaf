import { MikroORM } from '@mikro-orm/postgresql'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import { graphql } from '@test/gql'
import { ChangeStatus } from '@test/gql/types.generated'
import { GraphQLTestClient } from '@test/graphql.utils'

import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { OrgSeeder } from '@src/db/seeds/OrgSeeder'
import { TestMaterialSeeder } from '@src/db/seeds/TestMaterialSeeder'
import { TestProcessSeeder } from '@src/db/seeds/TestProcessSeeder'
import { TestTagSeeder } from '@src/db/seeds/TestTagSeeder'
import { TestVariantSeeder } from '@src/db/seeds/TestVariantSeeder'
import { UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'
import { Org } from '@src/users/org.entity'
import { WindmillMockService } from '@src/windmill/windmill.mock.service'
import { WindmillService } from '@src/windmill/windmill.service'

describe('OrgResolver (integration)', () => {
  let app: INestApplication
  let gql: GraphQLTestClient
  let orgID: string
  let orm: MikroORM

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
      OrgSeeder,
      TestProcessSeeder,
      TestTagSeeder,
      TestVariantSeeder,
    )

    await gql.signIn('admin', 'password')

    const org = await orm.em.findOne(Org, { slug: 'sage' })
    if (!org) {
      throw new Error('Seeded org not found')
    }
    orgID = org.id
  })

  afterAll(async () => {
    await app.close()
  })

  test('should query a single org', async () => {
    const res = await gql.send(
      graphql(`
        query OrgResolverGetOrg($id: ID!) {
          org(id: $id) {
            id
            name
            slug
          }
        }
      `),
      { id: orgID },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.org).toBeDefined()
    expect(res.data?.org?.id).toBe(orgID)
  })

  test('should query org users with pagination', async () => {
    const res = await gql.send(
      graphql(`
        query OrgResolverGetOrgUsers($id: ID!, $first: Int) {
          org(id: $id) {
            id
            users(first: $first) {
              nodes {
                id
                username
              }
              totalCount
              pageInfo {
                hasNextPage
                hasPreviousPage
              }
            }
          }
        }
      `),
      { id: orgID, first: 10 },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.org?.users).toBeDefined()
    expect(Array.isArray(res.data?.org?.users.nodes)).toBe(true)
    expect(res.data?.org?.users.totalCount).toBeGreaterThanOrEqual(0)
    expect(res.data?.org?.users.pageInfo?.hasNextPage).toBeDefined()
    expect(res.data?.org?.users.pageInfo?.hasPreviousPage).toBeDefined()
  })

  test('should create an org', async () => {
    const res = await gql.send(
      graphql(`
        mutation OrgResolverCreateOrg($input: CreateOrgInput!) {
          createOrg(input: $input) {
            org {
              id
              name
              slug
            }
          }
        }
      `),
      {
        input: {
          name: 'Test Organization',
          slug: 'test-org',
        },
      },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.createOrg?.org).toBeDefined()
    expect(res.data?.createOrg?.org?.name).toBe('Test Organization')
    expect(res.data?.createOrg?.org?.slug).toBe('test-org')
  })

  test('should populate nameTr alongside name on create', async () => {
    const res = await gql.send(
      graphql(`
        mutation OrgResolverCreateOrgNameTr($input: CreateOrgInput!) {
          createOrg(input: $input) {
            org {
              id
              name
            }
          }
        }
      `),
      {
        input: {
          name: 'Brick Recycler',
          slug: 'brick-recycler',
        },
      },
    )
    expect(res.errors).toBeUndefined()
    const createdID = res.data?.createOrg?.org?.id
    expect(createdID).toBeDefined()
    expect(res.data?.createOrg?.org?.name).toBe('Brick Recycler')

    orm.em.clear()
    const org = await orm.em.findOne(Org, { id: createdID })
    expect(org?.name).toBe('Brick Recycler')
    expect(org?.nameTr).toMatchObject({ en: 'Brick Recycler' })
  })

  test('should populate nameTr alongside name on update', async () => {
    const createRes = await gql.send(
      graphql(`
        mutation OrgResolverCreateOrgForNameTrUpdate($input: CreateOrgInput!) {
          createOrg(input: $input) {
            org {
              id
            }
          }
        }
      `),
      {
        input: {
          name: 'Original Name',
          slug: 'org-for-nametr-update',
        },
      },
    )
    const updateOrgID = createRes.data?.createOrg?.org?.id
    expect(updateOrgID).toBeDefined()
    if (!updateOrgID) throw new Error('updateOrgID is not defined')

    const res = await gql.send(
      graphql(`
        mutation OrgResolverUpdateOrgNameTr($input: UpdateOrgInput!) {
          updateOrg(input: $input) {
            org {
              id
              name
            }
          }
        }
      `),
      {
        input: {
          id: updateOrgID,
          name: 'Brick Recycler',
        },
      },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.updateOrg?.org?.name).toBe('Brick Recycler')

    orm.em.clear()
    const org = await orm.em.findOne(Org, { id: updateOrgID })
    expect(org?.name).toBe('Brick Recycler')
    expect(org?.nameTr).toMatchObject({ en: 'Brick Recycler' })
  })

  test('should update an org', async () => {
    const res = await gql.send(
      graphql(`
        mutation OrgResolverUpdateOrg($input: UpdateOrgInput!) {
          updateOrg(input: $input) {
            org {
              id
              name
            }
          }
        }
      `),
      {
        input: {
          id: orgID,
          name: 'Updated Org Name',
        },
      },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.updateOrg?.org?.id).toBe(orgID)
    expect(res.data?.updateOrg?.org?.name).toBe('Updated Org Name')
  })

  test('should return error for non-existent org', async () => {
    const res = await gql.send(
      graphql(`
        query OrgResolverGetNonExistentOrg($id: ID!) {
          org(id: $id) {
            id
          }
        }
      `),
      { id: 'non-existent-id' },
    )
    expect(res.errors).toBeDefined()
    expect(res.errors).toHaveLength(1)
    expect(res.errors?.[0].message).toContain('Org not found')
  })

  // Comprehensive Create Tests
  describe('CreateOrg comprehensive field tests', () => {
    test('should create org with all text fields', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateOrgAllFields($input: CreateOrgInput!) {
            createOrg(input: $input) {
              org {
                id
                name
                slug
                desc
                avatarURL
                websiteURL
              }
            }
          }
        `),
        {
          input: {
            name: 'Comprehensive Test Org',
            slug: 'comp-test-org',
            desc: 'Detailed org description',
            avatarURL: 'https://example.com/avatar.jpg',
            websiteURL: 'https://comptest.org',
            lang: 'en',
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createOrg?.org).toBeDefined()
      expect(res.data?.createOrg?.org?.name).toBe('Comprehensive Test Org')
      expect(res.data?.createOrg?.org?.slug).toBe('comp-test-org')
      expect(res.data?.createOrg?.org?.desc).toBe('Detailed org description')
      expect(res.data?.createOrg?.org?.avatarURL).toBe('https://example.com/avatar.jpg')
      expect(res.data?.createOrg?.org?.websiteURL).toBe('https://comptest.org')
    })

    test('should create org with change tracking', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateOrgWithChange($input: CreateOrgInput!) {
            createOrg(input: $input) {
              org {
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
            name: 'Org with Change',
            slug: 'org-with-change',
            change: {
              title: 'Add new org',
              status: ChangeStatus.Draft,
            },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createOrg?.org).toBeDefined()
      expect(res.data?.createOrg?.org?.name).toBe('Org with Change')
      expect(res.data?.createOrg?.change).toBeDefined()
      expect(res.data?.createOrg?.change?.status).toBe('DRAFT')
    })
  })

  // Comprehensive Update Tests
  describe('UpdateOrg comprehensive field tests', () => {
    let testOrgID: string

    beforeAll(async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateOrgForUpdate($input: CreateOrgInput!) {
            createOrg(input: $input) {
              org {
                id
              }
            }
          }
        `),
        {
          input: {
            name: 'Org for Updates',
            slug: 'org-for-updates',
          },
        },
      )
      if (res.data?.createOrg?.org?.id) {
        testOrgID = res.data?.createOrg?.org?.id
      } else {
        throw new Error('Failed to create org for update tests')
      }
    })

    test('should update org text fields', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateOrgText($input: UpdateOrgInput!) {
            updateOrg(input: $input) {
              org {
                id
                name
                desc
                websiteURL
              }
            }
          }
        `),
        {
          input: {
            id: testOrgID,
            name: 'Updated Org Name',
            desc: 'Updated Description',
            websiteURL: 'https://updated.org',
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateOrg?.org?.id).toBe(testOrgID)
      expect(res.data?.updateOrg?.org?.name).toBe('Updated Org Name')
      expect(res.data?.updateOrg?.org?.desc).toBe('Updated Description')
      expect(res.data?.updateOrg?.org?.websiteURL).toBe('https://updated.org')
    })

    test('should update org with change tracking', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateOrgWithChange($input: UpdateOrgInput!) {
            updateOrg(input: $input) {
              org {
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
            id: testOrgID,
            name: 'Updated via Change',
            change: {
              title: 'Update org',
              status: ChangeStatus.Proposed,
            },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateOrg?.org).toBeDefined()
      expect(res.data?.updateOrg?.org?.id).toBe(testOrgID)
      expect(res.data?.updateOrg?.change).toBeDefined()
      expect(res.data?.updateOrg?.change?.status).toBe('PROPOSED')
    })

    test('should return currentOrg with DB state when using change tracking', async () => {
      // First set a known name directly in the DB
      const directRes = await gql.send(
        graphql(`
          mutation OrgSetCurrentName($input: UpdateOrgInput!) {
            updateOrg(input: $input) {
              org {
                id
                name
              }
            }
          }
        `),
        { input: { id: testOrgID, name: 'Current DB Name' } },
      )
      expect(directRes.errors).toBeUndefined()

      // Now update via change — org should show proposed, currentOrg the DB value
      const changeRes = await gql.send(
        graphql(`
          mutation UpdateOrgWithChangeCurrentOrg($input: UpdateOrgInput!) {
            updateOrg(input: $input) {
              org {
                id
                name
              }
              currentOrg {
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
            id: testOrgID,
            name: 'Proposed Name',
            change: { title: 'current org test' },
          },
        },
      )
      expect(changeRes.errors).toBeUndefined()
      expect(changeRes.data?.updateOrg?.org?.name).toBe('Proposed Name')
      expect(changeRes.data?.updateOrg?.currentOrg?.name).toBe('Current DB Name')
      expect(changeRes.data?.updateOrg?.currentOrg?.id).toBe(testOrgID)
    })
  })

  describe('history tracking', () => {
    let historyOrgID: string

    test('should record history on direct create', async () => {
      const res = await gql.send(
        graphql(`
          mutation OrgHistoryCreate($input: CreateOrgInput!) {
            createOrg(input: $input) {
              org {
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
        { input: { name: 'History Org', slug: 'history-org' } },
      )
      expect(res.errors).toBeUndefined()
      historyOrgID = res.data!.createOrg!.org!.id
      const history = res.data?.createOrg?.org?.history.nodes
      expect(history).toHaveLength(1)
      expect(history![0].user).toBeDefined()
      expect(history![0].original).toBeNull()
      expect(history![0].changes).toBeTruthy()
    })

    test('should record history on direct update', async () => {
      const res = await gql.send(
        graphql(`
          mutation OrgHistoryUpdate($input: UpdateOrgInput!) {
            updateOrg(input: $input) {
              org {
                id
                history {
                  nodes {
                    datetime
                    user {
                      id
                    }
                    original {
                      id
                      name
                    }
                    changes {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        `),
        { input: { id: historyOrgID, name: 'History Org Updated' } },
      )
      expect(res.errors).toBeUndefined()
      const history = res.data?.updateOrg?.org?.history.nodes
      expect(history).toHaveLength(2)
      const latest = history!.at(-1)!
      expect(latest.user).toBeDefined()
      expect(latest.original).toBeTruthy()
      expect(latest.changes).toBeTruthy()
      expect(latest.original?.name).toBe('History Org')
      expect(latest.changes?.name).toBe('History Org Updated')
    })
  })
})
