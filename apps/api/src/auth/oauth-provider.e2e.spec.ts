import crypto from 'node:crypto'

import { MikroORM } from '@mikro-orm/postgresql'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import type { TestHelpers } from 'better-auth/plugins'
import request from 'supertest'

import { AuthModuleOptions, MODULE_OPTIONS_TOKEN } from '@src/auth/auth-module-definition'
import { getApiOrigin } from '@src/auth/oauth.constants'
import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'
import { User } from '@src/users/users.entity'

describe('OAuth provider (integration)', () => {
  let app: INestApplication
  let orm: MikroORM
  let testHelpers: TestHelpers
  let cookieHeader: string

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule],
    }).compile()

    app = module.createNestApplication()
    // Bind to the same host:port as BETTER_AUTH_URL (see .env.test.local), matching
    // jwt-jwks.spec.ts: better-auth resolves the issuer from BETTER_AUTH_URL at startup.
    await app.listen(4444, '127.0.0.1')

    orm = module.get<MikroORM>(MikroORM)
    const authOptions = module.get<AuthModuleOptions>(MODULE_OPTIONS_TOKEN)

    await clearDatabase(orm, 'auth')
    await clearDatabase(orm, 'public')
    await orm.seeder.seed(BaseSeeder, UserSeeder)

    // `testUtils()` is only added to the plugins array under NODE_ENV=test (see
    // configureAuth), so `ctx.test` isn't statically typed on `$context` — cast it.
    const ctx = (await authOptions.auth.$context) as unknown as { test: TestHelpers }
    testHelpers = ctx.test

    const user = await orm.em.fork().findOneOrFail(User, { username: 'user' })
    const cookies = await testHelpers.getCookies({ userId: user.id })
    cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join('; ')
  })

  afterAll(async () => {
    await app.close()
  })

  test('GET /.well-known/oauth-authorization-server/auth returns RFC 8414 metadata', async () => {
    const res = await request(app.getHttpServer()).get(
      '/.well-known/oauth-authorization-server/auth',
    )

    expect(res.status).toBe(200)
    expect(res.body.issuer).toMatch(/\/auth$/)
    expect(res.body.authorization_endpoint).toMatch(/\/auth\/oauth2\/authorize$/)
    expect(res.body.token_endpoint).toMatch(/\/auth\/oauth2\/token$/)
    expect(res.body.registration_endpoint).toMatch(/\/auth\/oauth2\/register$/)
  })

  test('full authorize -> consent -> token round trip using a dynamically registered client', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/auth/oauth2/register')
      .send({
        redirect_uris: ['https://client.example.com/callback'],
        token_endpoint_auth_method: 'none',
      })
    expect(registerRes.status).toBe(200)
    const clientId: string = registerRes.body.client_id
    const redirectUri: string = registerRes.body.redirect_uris[0]
    expect(clientId).toBeTruthy()

    const codeVerifier = crypto.randomBytes(32).toString('base64url')
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url')

    // MCP clients canonicalize the resource identifier through the `URL` API, which
    // appends a trailing slash to a bare-origin URL (e.g. `new URL(origin).toString()`).
    // Exercise that form here since it's what a spec-compliant client actually sends.
    const resource = `${getApiOrigin()}/`

    const authorizeRes = await request(app.getHttpServer())
      .get('/auth/oauth2/authorize')
      .set('Cookie', cookieHeader)
      .set('Accept', 'application/json')
      .query({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: 'openid profile email',
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        resource,
      })

    expect(authorizeRes.status).toBe(200)
    expect(authorizeRes.body.redirect).toBe(true)
    const consentUrl = new URL(authorizeRes.body.url)
    expect(consentUrl.pathname).toBe('/oauth/consent')

    const consentRes = await request(app.getHttpServer())
      .post('/auth/oauth2/consent')
      .set('Cookie', cookieHeader)
      .set('Accept', 'application/json')
      .send({ accept: true, oauth_query: consentUrl.search.slice(1) })

    expect(consentRes.status).toBe(200)
    const redirectWithCode = new URL(consentRes.body.url)
    expect(redirectWithCode.origin + redirectWithCode.pathname).toBe(redirectUri)
    const code = redirectWithCode.searchParams.get('code')
    expect(code).toBeTruthy()

    const tokenRes = await request(app.getHttpServer())
      .post('/auth/oauth2/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        client_id: clientId,
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
        resource,
      })

    expect(tokenRes.status).toBe(200)
    expect(typeof tokenRes.body.access_token).toBe('string')
    expect(tokenRes.body.access_token.length).toBeGreaterThan(0)
    expect(typeof tokenRes.body.id_token).toBe('string')
  })

  test('POST /auth/token (JWT plugin token endpoint) is disabled', async () => {
    const res = await request(app.getHttpServer()).post('/auth/token').set('Cookie', cookieHeader)

    expect(res.status).toBe(404)
  })

  test('GET /auth/get-session does not set the set-auth-jwt header', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/get-session')
      .set('Cookie', cookieHeader)

    expect(res.headers['set-auth-jwt']).toBeUndefined()
  })
})
