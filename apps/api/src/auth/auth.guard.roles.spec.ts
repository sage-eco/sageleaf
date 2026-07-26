import { EntityManager, MikroORM } from '@mikro-orm/postgresql'
import { ForbiddenException, INestApplication } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import { ClsService } from 'nestjs-cls'
import request from 'supertest'

import { AuthModuleOptions, MODULE_OPTIONS_TOKEN } from '@src/auth/auth-module-definition'
import { AuthGuard } from '@src/auth/auth.guard'
import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'
import { Org } from '@src/users/org.entity'
import { User, UserOrgRole, UsersOrgs } from '@src/users/users.entity'

describe('AuthGuard @Roles / @OrgRoles (integration, real DB-backed sessions)', () => {
  let app: INestApplication
  let orm: MikroORM
  let authOptions: AuthModuleOptions
  let cls: ClsService
  let em: EntityManager
  let adminUser: User
  let normalUser: User

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule],
    }).compile()

    app = module.createNestApplication()
    await app.init()

    orm = module.get<MikroORM>(MikroORM)
    authOptions = module.get<AuthModuleOptions>(MODULE_OPTIONS_TOKEN)
    cls = module.get<ClsService>(ClsService)
    em = orm.em

    await clearDatabase(orm, 'auth')
    await clearDatabase(orm, 'public')
    await orm.seeder.seed(BaseSeeder, UserSeeder)

    adminUser = await orm.em.findOneOrFail(User, { username: 'admin' })
    normalUser = await orm.em.findOneOrFail(User, { username: 'user' })
  })

  afterAll(async () => {
    await app.close()
  })

  function reflectorReturning(overrides: Record<string, unknown>): Reflector {
    return { getAllAndOverride: (key: string) => overrides[key] } as unknown as Reflector
  }

  function canActivate(guard: AuthGuard, context: unknown): Promise<boolean> {
    // canActivate() reads/writes CLS-scoped state, which is normally set up per-request by
    // ClsMiddleware; calling the guard directly (bypassing HTTP) needs the same wrapping.
    return cls.run(() => guard.canActivate(context as never))
  }

  function contextWithCookie(cookie: string) {
    const request: { headers: Record<string, string> } = { headers: { cookie } }
    return {
      getType: () => 'http' as const,
      getHandler: () => ({}),
      getClass: () => class TestTarget {},
      switchToHttp: () => ({ getRequest: () => request }),
      // biome-ignore lint/suspicious/noExplicitAny: minimal fake ExecutionContext
    } as any
  }

  function asCookieArray(setCookie: unknown): string[] {
    if (!setCookie) return []
    return Array.isArray(setCookie) ? setCookie : [setCookie as string]
  }

  function cookieHeader(cookies: string[]): string {
    return cookies.map((c) => c.split(';')[0]).join('; ')
  }

  async function signIn(username: string): Promise<string[]> {
    const res = await request(app.getHttpServer())
      .post('/auth/sign-in/username')
      .set('Content-Type', 'application/json')
      .send({ username, password: 'password' })

    if (res.status !== 200) {
      throw new Error(`Sign in failed for ${username}: ${res.status} ${JSON.stringify(res.body)}`)
    }
    return asCookieArray(res.headers['set-cookie'])
  }

  async function setActiveOrganization(
    cookies: string[],
    organizationId: string,
  ): Promise<string[]> {
    const res = await request(app.getHttpServer())
      .post('/auth/organization/set-active')
      .set('Cookie', cookieHeader(cookies))
      .set('Content-Type', 'application/json')
      .send({ organizationId })

    if (res.status !== 200) {
      throw new Error(`set-active failed: ${res.status} ${JSON.stringify(res.body)}`)
    }
    const refreshed = asCookieArray(res.headers['set-cookie'])
    return refreshed.length > 0 ? refreshed : cookies
  }

  describe('@Roles(["admin"]) — user.role only', () => {
    test('admin session is allowed', async () => {
      const cookies = await signIn('admin')
      const guard = new AuthGuard(reflectorReturning({ ROLES: ['admin'] }), authOptions, cls, em)

      await expect(canActivate(guard, contextWithCookie(cookieHeader(cookies)))).resolves.toBe(true)
    })

    test('non-admin session is rejected with ForbiddenException', async () => {
      const cookies = await signIn('user')
      const guard = new AuthGuard(reflectorReturning({ ROLES: ['admin'] }), authOptions, cls, em)

      await expect(
        canActivate(guard, contextWithCookie(cookieHeader(cookies))),
      ).rejects.toBeInstanceOf(ForbiddenException)
    })
  })

  describe('@OrgRoles(["owner"]) — organization member role, DB-backed', () => {
    let org: Org

    beforeAll(async () => {
      org = em.create(Org, {
        name: 'Guard Test Org',
        slug: 'guard-test-org',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      em.create(UsersOrgs, {
        user: adminUser,
        org,
        role: UserOrgRole.OWNER,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      em.create(UsersOrgs, {
        user: normalUser,
        org,
        role: UserOrgRole.MEMBER,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await em.flush()
    })

    test('org owner is allowed', async () => {
      let cookies = await signIn('admin')
      cookies = await setActiveOrganization(cookies, org.id)
      const guard = new AuthGuard(
        reflectorReturning({ ORG_ROLES: ['owner'] }),
        authOptions,
        cls,
        em,
      )

      await expect(canActivate(guard, contextWithCookie(cookieHeader(cookies)))).resolves.toBe(true)
    })

    test('org member (non-owner) is rejected with ForbiddenException', async () => {
      let cookies = await signIn('user')
      cookies = await setActiveOrganization(cookies, org.id)
      const guard = new AuthGuard(
        reflectorReturning({ ORG_ROLES: ['owner'] }),
        authOptions,
        cls,
        em,
      )

      await expect(
        canActivate(guard, contextWithCookie(cookieHeader(cookies))),
      ).rejects.toBeInstanceOf(ForbiddenException)
    })
  })
})
