import { ConfigService } from '@nestjs/config'
import { GraphQLSchemaHost } from '@nestjs/graphql'
import { buildSchema, parse } from 'graphql'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { AuthService } from '@src/auth/auth.service'
import { RateLimitPlugin } from '@src/rate-limit/rate-limit.plugin'
import { RateLimitService } from '@src/rate-limit/rate-limit.service'

describe('RateLimitPlugin', () => {
  let plugin: RateLimitPlugin
  let rateLimitService: { consume: ReturnType<typeof vi.fn> }
  let authService: { api: { getSession: ReturnType<typeof vi.fn> } }
  let configService: { get: ReturnType<typeof vi.fn> }

  const schema = buildSchema('type Query { __typename: String }')
  const document = parse('{ __typename }')

  beforeEach(() => {
    rateLimitService = { consume: vi.fn() }
    authService = { api: { getSession: vi.fn() } }
    configService = { get: vi.fn().mockReturnValue(undefined) }

    plugin = new RateLimitPlugin(
      { schema } as GraphQLSchemaHost,
      rateLimitService as unknown as RateLimitService,
      authService as unknown as AuthService,
      configService as unknown as ConfigService,
    )
  })

  async function resolveOperation(req?: { headers: Record<string, string>; ip?: string }) {
    const listener = await plugin.requestDidStart()
    return listener.didResolveOperation?.({
      request: { operationName: undefined, variables: undefined },
      document,
      contextValue: { req },
    } as never)
  }

  test('does nothing when the request is allowed', async () => {
    rateLimitService.consume.mockResolvedValue({ allowed: true, retryAfterMs: 0 })

    await expect(resolveOperation({ headers: {}, ip: '1.2.3.4' })).resolves.toBeUndefined()
  })

  test('throws a 429 with a Retry-After header when the request is rate limited', async () => {
    rateLimitService.consume.mockResolvedValue({ allowed: false, retryAfterMs: 4200 })

    await expect(resolveOperation({ headers: {}, ip: '1.2.3.4' })).rejects.toMatchObject({
      message: 'Rate limit exceeded',
      extensions: expect.objectContaining({
        code: 'RATE_LIMITED',
        retryAfterMs: 4200,
        http: expect.objectContaining({
          status: 429,
          headers: expect.objectContaining({ get: expect.any(Function) }),
        }),
      }),
    })

    const error = await resolveOperation({ headers: {}, ip: '1.2.3.4' }).catch((err) => err)
    expect(error.extensions.http.headers.get('retry-after')).toBe('5')
  })

  test('skips rate limiting entirely when disabled via config', async () => {
    configService.get.mockImplementation((key: string) =>
      key === 'rateLimit.enabled' ? false : undefined,
    )

    await resolveOperation({ headers: {}, ip: '1.2.3.4' })

    expect(rateLimitService.consume).not.toHaveBeenCalled()
  })

  test('keys anonymous requests by IP and authenticated requests by session user', async () => {
    rateLimitService.consume.mockResolvedValue({ allowed: true, retryAfterMs: 0 })

    await resolveOperation({ headers: {}, ip: '5.6.7.8' })
    expect(rateLimitService.consume).toHaveBeenCalledWith('ip:5.6.7.8', 1, 'anonymous')

    authService.api.getSession.mockResolvedValue({ user: { id: 'user-1' } })
    await resolveOperation({ headers: { cookie: 'session=abc' }, ip: '5.6.7.8' })
    expect(rateLimitService.consume).toHaveBeenCalledWith('user:user-1', 1, 'authenticated')
  })
})
