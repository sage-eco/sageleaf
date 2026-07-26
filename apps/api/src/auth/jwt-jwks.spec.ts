import { MikroORM } from '@mikro-orm/postgresql'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import { GraphQLTestClient } from '@test/graphql.utils'
import request from 'supertest'

import { AuthModuleOptions, MODULE_OPTIONS_TOKEN } from '@src/auth/auth-module-definition'
import { Jwks } from '@src/auth/jwks.entity'
import { createResourceClient } from '@src/auth/resource-client'
import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'
import { User } from '@src/users/users.entity'

/**
 * Decodes a JWT payload without verifying its signature. `configureAuth` never sets an
 * explicit `baseURL`, so better-auth derives the token's `iss`/`aud` from the incoming
 * request's inferred origin at sign time (see better-auth's `auth/base.mjs` handler) rather
 * than from a fixed config value — the test reads the real claims back out instead of
 * guessing what host:port supertest's ephemeral server bound to.
 */
function decodeJwtPayload(token: string): { iss: string; aud: string; sub: string } {
  const [, payloadSegment] = token.split('.')
  return JSON.parse(Buffer.from(payloadSegment, 'base64url').toString('utf8'))
}

describe('JWT/JWKS (integration, regression for b.createdAt.getTime crash)', () => {
  let app: INestApplication
  let orm: MikroORM
  let authOptions: AuthModuleOptions
  let cookies: string[]

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule],
    }).compile()

    app = module.createNestApplication()
    // Bind to the same host:port as BETTER_AUTH_URL (see .env.test.local) rather than
    // supertest's usual ephemeral binding: better-auth resolves the JWT's `iss`/`aud`
    // claims from BETTER_AUTH_URL at startup, and verifying the token below requires
    // fetching its JWKS from that same origin.
    await app.listen(4444, '127.0.0.1')

    orm = module.get<MikroORM>(MikroORM)
    authOptions = module.get<AuthModuleOptions>(MODULE_OPTIONS_TOKEN)

    await clearDatabase(orm, 'auth')
    await clearDatabase(orm, 'public')
    await orm.seeder.seed(BaseSeeder, UserSeeder)

    const gql = new GraphQLTestClient(app)
    await gql.signIn('admin', 'password')
    cookies = (gql as any).cookies
  })

  afterAll(async () => {
    await app.close()
  })

  function cookieHeader() {
    return cookies.map((c) => c.split(';')[0]).join('; ')
  }

  test('seeded with two jwks rows, GET /auth/jwks does not crash', async () => {
    // Trigger natural key creation (creates the first row).
    const firstTokenRes = await request(app.getHttpServer())
      .get('/auth/token')
      .set('Cookie', cookieHeader())
    expect(firstTokenRes.status).toBe(200)
    expect(firstTokenRes.body.token).toBeDefined()

    const [firstKey] = await orm.em
      .fork()
      .find(Jwks, {}, { orderBy: { createdAt: 'ASC' }, limit: 1 })

    // Clone the row with a distinct id/createdAt so getLatestKey's sort() comparator
    // actually runs (Array.prototype.sort never invokes its comparator for length <= 1,
    // which is why the original crash required 2+ rows to reproduce).
    const em = orm.em.fork()
    em.create(Jwks, {
      publicKey: firstKey.publicKey,
      privateKey: firstKey.privateKey,
      createdAt: new Date(firstKey.createdAt.getTime() - 1000),
    })
    await em.flush()

    const jwksRes = await request(app.getHttpServer()).get('/auth/jwks')
    expect(jwksRes.status).toBe(200)
    expect(jwksRes.body.keys?.length).toBeGreaterThanOrEqual(2)
  })

  test('GET /auth/token mints a JWT without throwing, and it verifies via the resource client', async () => {
    const tokenRes = await request(app.getHttpServer())
      .get('/auth/token')
      .set('Cookie', cookieHeader())

    expect(tokenRes.status).toBe(200)
    expect(typeof tokenRes.body.token).toBe('string')
    expect(tokenRes.body.token.length).toBeGreaterThan(0)

    const claims = decodeJwtPayload(tokenRes.body.token)

    const resourceClient = createResourceClient(authOptions.auth)
    const payload = await resourceClient.verifyAccessToken(tokenRes.body.token, {
      jwksUrl: `${claims.iss}/auth/jwks`,
      verifyOptions: {
        issuer: claims.iss,
        audience: claims.aud,
      },
    })

    const adminUser = await orm.em.fork().findOneOrFail(User, { username: 'admin' })
    expect(payload.sub).toBe(adminUser.id)
  })
})
