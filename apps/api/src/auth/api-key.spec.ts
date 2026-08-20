import { MikroORM } from '@mikro-orm/postgresql'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import { graphql } from '@test/gql'
import { SourceType } from '@test/gql/graphql'
import { GraphQLTestClient } from '@test/graphql.utils'
import request from 'supertest'

import { Change } from '@src/changes/change.entity'
import { Source } from '@src/changes/source.entity'
import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'
import { User } from '@src/users/users.entity'

describe('API Key Authentication (integration)', () => {
  let app: INestApplication
  let gql: GraphQLTestClient
  let orm: MikroORM
  let adminUser: User
  let apiKeyValue: string

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule],
    }).compile()

    app = module.createNestApplication()
    await app.init()

    gql = new GraphQLTestClient(app)
    orm = module.get<MikroORM>(MikroORM)

    await clearDatabase(orm, 'auth')
    await clearDatabase(orm, 'public')
    await orm.seeder.seed(BaseSeeder, UserSeeder)

    adminUser = await orm.em.findOneOrFail(User, { username: 'admin' })

    // Sign in with cookie auth to create an API key
    const cookieGql = new GraphQLTestClient(app)
    await cookieGql.signIn('admin', 'password')

    // Extract cookies from the signed-in client to POST to BetterAuth endpoint
    const cookies: string[] = (cookieGql as any).cookies
    const res = await request(app.getHttpServer())
      .post('/auth/api-key/create')
      .set('Cookie', cookies.map((c) => c.split(';')[0]).join('; '))
      .set('Content-Type', 'application/json')
      .send({})

    if (res.status !== 200) {
      throw new Error(`API key creation failed: ${res.status} ${JSON.stringify(res.body)}`)
    }

    apiKeyValue = res.body.key
    if (!apiKeyValue) {
      throw new Error(`No API key in response: ${JSON.stringify(res.body)}`)
    }

    // Switch the shared client to API key auth (no cookies)
    gql.useApiKey(apiKeyValue)
  })

  afterAll(async () => {
    await app.close()
  })

  test('createChange via API key stores correct userId in database', async () => {
    const res = await gql.send(
      graphql(`
        mutation ApiKeyCreateChange($input: CreateChangeInput!) {
          createChange(input: $input) {
            change {
              id
              title
            }
          }
        }
      `),
      {
        input: {
          title: 'API Key Change Test',
          description: 'Created via API key auth',
        },
      },
    )

    const changeId = res.data?.createChange?.change?.id
    expect(changeId).toBeDefined()
    expect(res.data?.createChange?.change?.title).toBe('API Key Change Test')

    // Verify the correct userId was stored in the database
    const change = await orm.em.findOneOrFail(Change, { id: changeId }, { populate: ['user'] })
    expect(change.user.id).toBe(adminUser.id)
  })

  test('createSource via API key stores correct userId in database', async () => {
    const res = await gql.send(
      graphql(`
        mutation ApiKeyCreateSource($input: CreateSourceInput!) {
          createSource(input: $input) {
            source {
              id
              type
            }
          }
        }
      `),
      {
        input: {
          type: SourceType.Text,
        },
      },
    )

    const sourceId = res.data?.createSource?.source?.id
    expect(sourceId).toBeDefined()
    expect(res.data?.createSource?.source?.type).toBe(SourceType.Text)

    // Verify the correct userId was stored in the database
    const source = await orm.em.findOneOrFail(Source, { id: sourceId }, { populate: ['user'] })
    expect(source.user.id).toBe(adminUser.id)
  })

  test('request without auth is rejected', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Content-Type', 'application/json')
      .send({
        query: `mutation { createChange(input: { title: "Should Fail", description: "Unauthorized" }) { change { id } } }`,
      })

    const errors = res.body.errors
    expect(errors).toBeDefined()
    expect(errors?.length).toBeGreaterThan(0)
    expect(errors?.some((e: any) => e.message === 'Unauthorized')).toBe(true)
  })
})
