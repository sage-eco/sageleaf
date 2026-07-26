import { MikroORM } from '@mikro-orm/postgresql'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import { graphql } from '@test/gql'
import { GraphQLTestClient } from '@test/graphql.utils'
import request from 'supertest'

import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'
import { User } from '@src/users/users.entity'

describe('Session cookie authentication (integration)', () => {
  let app: INestApplication
  let orm: MikroORM
  let normalUser: User

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule],
    }).compile()

    app = module.createNestApplication()
    await app.init()

    orm = module.get<MikroORM>(MikroORM)

    await clearDatabase(orm, 'auth')
    await clearDatabase(orm, 'public')
    await orm.seeder.seed(BaseSeeder, UserSeeder)

    normalUser = await orm.em.findOneOrFail(User, { username: 'user' })
  })

  afterAll(async () => {
    await app.close()
  })

  test('a real cookie-authenticated GraphQL query succeeds and resolves the signed-in user', async () => {
    const gql = new GraphQLTestClient(app)
    await gql.signIn('user', 'password')

    const res = await gql.send(
      graphql(`
        query AuthSessionMe {
          me {
            id
            username
          }
        }
      `),
    )

    expect(res.errors).toBeUndefined()
    expect(res.data?.me?.id).toBe(normalUser.id)
    expect(res.data?.me?.username).toBe('user')
  })

  test('request without any cookie or header is rejected with Unauthorized', async () => {
    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Content-Type', 'application/json')
      .send({
        query: `query { me { id } }`,
      })

    const errors = res.body.errors
    expect(errors).toBeDefined()
    expect(errors?.length).toBeGreaterThan(0)
    expect(errors?.some((e: any) => e.message === 'Unauthorized')).toBe(true)
  })
})
