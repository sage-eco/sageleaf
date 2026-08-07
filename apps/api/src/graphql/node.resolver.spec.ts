import { MikroORM } from '@mikro-orm/postgresql'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import { graphql } from '@test/gql'
import { GraphQLTestClient } from '@test/graphql.utils'

import { CATEGORY_IDS, TestCategorySeeder } from '@src/db/seeds/TestCategorySeeder'
import { UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'
import { toGlobalId } from '@src/graphql/global-id'

describe('NodeResolver (integration)', () => {
  let app: INestApplication
  let gql: GraphQLTestClient
  const categoryID = CATEGORY_IDS[0]

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule],
    }).compile()

    app = module.createNestApplication()
    await app.init()

    gql = new GraphQLTestClient(app)

    const orm = module.get<MikroORM>(MikroORM)

    await clearDatabase(orm, 'public', ['users'])
    await orm.seeder.seed(UserSeeder, TestCategorySeeder)
  })

  afterAll(async () => {
    await app.close()
  })

  const nodeQuery = graphql(`
    query NodeResolverGetNode($id: ID!) {
      node(id: $id) {
        id
        ... on Named {
          name
        }
        ... on Category {
          desc
        }
      }
    }
  `)

  test('resolves a Category by its global ID, including Named and Category fragments', async () => {
    const res = await gql.send(nodeQuery, { id: toGlobalId('Category', categoryID) })
    expect(res.errors).toBeFalsy()
    expect(res.data?.node).toEqual(
      expect.objectContaining({
        id: categoryID,
        name: 'Packaging',
      }),
    )
  })

  test('returns null for a malformed global ID', async () => {
    const res = await gql.send(nodeQuery, { id: 'not-a-gid' })
    expect(res.errors).toBeFalsy()
    expect(res.data?.node).toBeNull()
  })

  test('returns null for an unrecognized type in the global ID', async () => {
    const res = await gql.send(nodeQuery, { id: toGlobalId('Bogus', categoryID) })
    expect(res.errors).toBeFalsy()
    expect(res.data?.node).toBeNull()
  })

  test('returns null for a recognized type with a nonexistent ID', async () => {
    const res = await gql.send(nodeQuery, { id: toGlobalId('Category', 'does-not-exist') })
    expect(res.errors).toBeFalsy()
    expect(res.data?.node).toBeNull()
  })

  const nodesQuery = graphql(`
    query NodeResolverGetNodes($ids: [ID!]!) {
      nodes(ids: $ids) {
        id
        ... on Named {
          name
        }
      }
    }
  `)

  test('resolves a mixed list of IDs, preserving order and nulling bad entries', async () => {
    const res = await gql.send(nodesQuery, {
      ids: [
        toGlobalId('Category', categoryID),
        'not-a-gid',
        toGlobalId('Bogus', categoryID),
        toGlobalId('Category', 'does-not-exist'),
        toGlobalId('Category', CATEGORY_IDS[1]),
      ],
    })
    expect(res.errors).toBeFalsy()
    expect(res.data?.nodes).toEqual([
      expect.objectContaining({ id: categoryID, name: 'Packaging' }),
      null,
      null,
      null,
      expect.objectContaining({ id: CATEGORY_IDS[1], name: 'Electronics' }),
    ])
  })
})
