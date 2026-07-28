import { ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { describe, expect, it, vi } from 'vitest'

import { AuthGuard } from '@src/auth/auth.guard'
import { OAUTH_SCOPES_METADATA_KEY } from '@src/auth/decorators'

const verifyAccessToken = vi.fn()

vi.mock('@src/auth/resource-client', () => ({
  createResourceClient: () => ({
    verifyAccessToken,
  }),
}))

vi.mock('@src/auth/oauth.constants', () => ({
  getApiOrigin: () => 'https://api.sageleaf.test',
  getAuthIssuer: () => 'https://auth.sageleaf.test',
}))

describe('AuthGuard bearer token scopes', () => {
  function createGuard(requiredOauthScopes?: string[]) {
    const reflector = {
      getAllAndOverride: vi.fn((key: string) => {
        if (key === OAUTH_SCOPES_METADATA_KEY) return requiredOauthScopes
        return undefined
      }),
    }

    const options = {
      auth: {
        api: {
          getSession: vi.fn().mockResolvedValue(null),
        },
      },
    }

    const cls = { set: vi.fn() }
    const em = {
      findOne: vi.fn().mockResolvedValue({ id: 'user-1' }),
    }

    const guard = new AuthGuard(
      reflector as unknown as Reflector,
      options as never,
      cls as never,
      em as never,
    )

    const request: { headers: { authorization: string }; oauthScopes?: string[] } = {
      headers: {
        authorization: 'Bearer test-token',
      },
    }

    const context = {
      getType: () => 'http' as const,
      getHandler: () => ({}),
      getClass: () => class TestResolver {},
      switchToHttp: () => ({ getRequest: () => request }),
    }

    return { guard, context, request }
  }

  it('rejects bearer tokens on routes without explicit OAuth scope metadata', async () => {
    verifyAccessToken.mockResolvedValueOnce({
      sub: 'user-1',
      scope: 'openid profile',
    })

    const { guard, context } = createGuard()

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('allows bearer tokens on routes with matching OAuth scopes', async () => {
    verifyAccessToken.mockResolvedValueOnce({
      sub: 'user-1',
      scope: 'process:write offline_access',
    })

    const { guard, context, request } = createGuard(['process:write'])

    await expect(guard.canActivate(context as never)).resolves.toBe(true)
    expect(request.oauthScopes).toEqual(['process:write', 'offline_access'])
  })

  it('verifies bearer tokens with an explicit jwksUrl', async () => {
    // configureAuth() never sets betterAuth's `baseURL`, so the resource client can't
    // derive a jwksUrl on its own (see jwt-jwks.spec.ts) — without passing one explicitly,
    // local JWT verification is silently skipped and every bearer token fails with
    // "no token payload", regardless of validity.
    verifyAccessToken.mockResolvedValueOnce({
      sub: 'user-1',
      scope: 'process:write',
    })

    const { guard, context } = createGuard(['process:write'])

    await guard.canActivate(context as never)

    expect(verifyAccessToken).toHaveBeenCalledWith(
      'test-token',
      expect.objectContaining({ jwksUrl: 'https://auth.sageleaf.test/jwks' }),
    )
  })

  it('rejects bearer tokens missing a required OAuth scope', async () => {
    verifyAccessToken.mockResolvedValueOnce({
      sub: 'user-1',
      scope: 'openid profile',
    })

    const { guard, context } = createGuard(['process:write'])

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(ForbiddenException)
  })
})
