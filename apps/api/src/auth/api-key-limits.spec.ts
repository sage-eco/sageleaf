import { defaultKeyHasher } from '@better-auth/api-key'
import { MikroORM } from '@mikro-orm/postgresql'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import request from 'supertest'

import { ApiKey } from '@src/auth/apikey.entity'
import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'
import { User } from '@src/users/users.entity'

describe('API Key expiry and rate limiting (integration)', () => {
  let app: INestApplication
  let orm: MikroORM
  let adminUser: User

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

    adminUser = await orm.em.findOneOrFail(User, { username: 'admin' })
  })

  afterAll(async () => {
    await app.close()
  })

  async function seedApiKey(plaintext: string, overrides: Partial<ApiKey>): Promise<void> {
    const em = orm.em.fork()
    em.create(ApiKey, {
      key: await defaultKeyHasher(plaintext),
      configId: 'default',
      referenceId: adminUser.id,
      enabled: true,
      rateLimitEnabled: true,
      requestCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    })
    await em.flush()
  }

  async function queryWithApiKey(plaintext: string) {
    return request(app.getHttpServer())
      .post('/graphql')
      .set('Content-Type', 'application/json')
      .set('x-api-key', plaintext)
      .send({ query: `query { me { id } }` })
  }

  test('expired key is rejected as unauthorized', async () => {
    const plaintext = `test-expired-${crypto.randomUUID()}`
    await seedApiKey(plaintext, {
      expiresAt: new Date(Date.now() - 60_000),
    })

    const res = await queryWithApiKey(plaintext)

    const errors = res.body.errors
    expect(errors).toBeDefined()
    expect(errors?.some((e: any) => e.message === 'Unauthorized')).toBe(true)
  })

  test('rate-limited key (requestCount >= max within the window) is rejected', async () => {
    const plaintext = `test-rate-limited-${crypto.randomUUID()}`
    await seedApiKey(plaintext, {
      rateLimitEnabled: true,
      rateLimitTimeWindow: 60_000,
      rateLimitMax: 1,
      requestCount: 5,
      lastRequest: new Date(),
    })

    const res = await queryWithApiKey(plaintext)

    // AuthGuard swallows whatever better-auth throws (expired key, rate limit, etc.) and
    // always surfaces it as a generic Unauthorized — it does not distinguish 401 vs 429.
    const errors = res.body.errors
    expect(errors).toBeDefined()
    expect(errors?.some((e: any) => e.message === 'Unauthorized')).toBe(true)
  })
})
