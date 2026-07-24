import { EntityManager } from '@mikro-orm/postgresql'
import {
  createParamDecorator,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import type { CanActivate, ContextType, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { getSession } from 'better-auth/api'
import { fromNodeHeaders } from 'better-auth/node'
import { ClsService } from 'nestjs-cls'

import { type AuthModuleOptions, MODULE_OPTIONS_TOKEN } from '@src/auth/auth-module-definition'
import { getApiOrigin, getAuthIssuer } from '@src/auth/oauth.constants'
import { createResourceClient } from '@src/auth/resource-client'
import { getRequestFromContext } from '@src/auth/utils'
import { User } from '@src/users/users.entity'

/**
 * Lazy-load GraphQLError to make graphql an optional dependency
 */

// biome-ignore lint/suspicious/noExplicitAny: GraphQLError type comes from optional graphql dependency
let GraphQLErrorClass: any
function getGraphQLError() {
  if (!GraphQLErrorClass) {
    try {
      GraphQLErrorClass = require('graphql').GraphQLError
    } catch (_error) {
      throw new Error(
        'graphql is required for GraphQL support. Please install it: npm install graphql',
      )
    }
  }
  return GraphQLErrorClass
}

/**
 * Type representing a valid user session after authentication
 * Excludes null and undefined values from the session return type
 */
export type BaseUserSession = NonNullable<Awaited<ReturnType<ReturnType<typeof getSession>>>>

export type UserSession = BaseUserSession & {
  user: BaseUserSession['user'] & {
    role?: string | string[]
  }
  session: BaseUserSession['session'] & {
    activeOrganizationId?: string
  }
}

export type ReqUser = UserSession['user']

const AuthErrorType = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
} as const

/**
 * Lazy-load WsException to make @nestjs/websockets an optional dependency
 */
// biome-ignore lint/suspicious/noExplicitAny: WsException type comes from optional @nestjs/websockets dependency
let WsException: any
function getWsException() {
  if (!WsException) {
    try {
      WsException = require('@nestjs/websockets').WsException
    } catch (_error) {
      throw new Error(
        '@nestjs/websockets is required for WebSocket support. Please install it: npm install @nestjs/websockets @nestjs/platform-socket.io',
      )
    }
  }
  return WsException
}

const AuthContextErrorMap: Record<
  ContextType | 'graphql',
  Record<keyof typeof AuthErrorType, (args?: unknown) => Error>
> = {
  http: {
    UNAUTHORIZED: (args) =>
      new UnauthorizedException(
        args ?? {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized',
        },
      ),
    FORBIDDEN: (args) =>
      new ForbiddenException(
        args ?? {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions',
        },
      ),
  },
  graphql: {
    UNAUTHORIZED: (args) => {
      const GraphQLError = getGraphQLError()
      if (typeof args === 'string') {
        return new GraphQLError(args)
      } else if (typeof args === 'object') {
        return new GraphQLError(
          // biome-ignore lint: if `message` is not set, a default is already in place.
          (args as any)?.message ?? 'Unauthorized',
          args,
        )
      }

      return new GraphQLError('Unauthorized')
    },
    FORBIDDEN: (args) => {
      const GraphQLError = getGraphQLError()
      if (typeof args === 'string') {
        return new GraphQLError(args)
      } else if (typeof args === 'object') {
        return new GraphQLError(
          // biome-ignore lint: if `message` is not set, a default is already in place.
          (args as any)?.message ?? 'Forbidden',
          args,
        )
      }

      return new GraphQLError('Forbidden')
    },
  },
  ws: {
    UNAUTHORIZED: (args) => {
      const WsExceptionClass = getWsException()
      return new WsExceptionClass(args ?? 'UNAUTHORIZED')
    },
    FORBIDDEN: (args) => {
      const WsExceptionClass = getWsException()
      return new WsExceptionClass(args ?? 'FORBIDDEN')
    },
  },
  rpc: {
    UNAUTHORIZED: () => new Error('UNAUTHORIZED'),
    FORBIDDEN: () => new Error('FORBIDDEN'),
  },
}

/**
 * NestJS guard that handles authentication for protected routes
 * Can be configured with @AllowAnonymous() or @OptionalAuth() decorators to modify authentication behavior
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private readonly logger = new Logger(AuthGuard.name)

  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Inject(MODULE_OPTIONS_TOKEN)
    private readonly options: AuthModuleOptions,
    private readonly cls: ClsService,
    private readonly em: EntityManager,
  ) {}

  /**
   * Validates if the current request is authenticated
   * Attaches session and user information to the request object
   * Supports HTTP, GraphQL and WebSocket execution contexts
   * @param context - The execution context of the current request
   * @returns True if the request is authorized to proceed, throws an error otherwise
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = getRequestFromContext(context)
    const nodeHeaders = request.headers || request?.handshake?.headers || []
    const session: UserSession | null = await this.options.auth.api.getSession({
      headers: fromNodeHeaders(nodeHeaders),
    })

    // Store session in CLS for access in AuthUserService
    this.cls.set('session', session)
    request.session = session

    // If no session, try bearer JWT (OAuth access token) authentication
    let bearerUser: ReqUser | null = null
    if (!session) {
      const bearerAuth = await this.authenticateViaBearerToken(nodeHeaders)
      if (bearerAuth) {
        bearerUser = bearerAuth.user
        request.oauthScopes = bearerAuth.scopes
        this.cls.set('user', bearerUser)
      }
    }

    // If no session or bearer token, try API key authentication (does not mock a session)
    let apiKeyUser: ReqUser | null = null
    if (!session && !bearerUser) {
      apiKeyUser = await this.authenticateViaApiKey(nodeHeaders)
      if (apiKeyUser) {
        this.cls.set('user', apiKeyUser)
      }
    }

    request.user = session?.user ?? bearerUser ?? apiKeyUser ?? null // useful for observability tools like Sentry

    const isPublic = this.reflector.getAllAndOverride<boolean>('PUBLIC', [
      context.getHandler(),
      context.getClass(),
    ])

    if (isPublic) return true

    const isOptional = this.reflector.getAllAndOverride<boolean>('OPTIONAL', [
      context.getHandler(),
      context.getClass(),
    ])

    const effectiveUser = session?.user ?? bearerUser ?? apiKeyUser ?? null

    if (!effectiveUser && isOptional) return true

    const ctxType = context.getType()
    if (!effectiveUser) throw AuthContextErrorMap[ctxType].UNAUTHORIZED()

    const headers = fromNodeHeaders(nodeHeaders)

    // Check @Roles() - user.role only (admin plugin)
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('ROLES', [
      context.getHandler(),
      context.getClass(),
    ])

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = this.matchesRequiredRole(effectiveUser.role, requiredRoles)
      if (!hasRole) throw AuthContextErrorMap[ctxType].FORBIDDEN()
    }

    // Check @OrgRoles() - organization member role only (requires a real session)
    const requiredOrgRoles = this.reflector.getAllAndOverride<string[]>('ORG_ROLES', [
      context.getHandler(),
      context.getClass(),
    ])

    if (requiredOrgRoles && requiredOrgRoles.length > 0) {
      if (!session) throw AuthContextErrorMap[ctxType].FORBIDDEN()
      const hasOrgRole = await this.checkOrgRole(session, headers, requiredOrgRoles)
      if (!hasOrgRole) throw AuthContextErrorMap[ctxType].FORBIDDEN()
    }

    return true
  }

  /**
   * Attempts to authenticate the request using an OAuth `Authorization: Bearer <token>` header.
   * Verifies the token locally via JWKS (no introspection round-trip) and resolves the
   * owning user from the JWT's `sub` claim.
   * Returns the owning user and requested scopes if valid, or null if no bearer token is
   * present or the token is invalid.
   */
  private async authenticateViaBearerToken(
    nodeHeaders: any,
  ): Promise<{ user: ReqUser; scopes: string[] } | null> {
    const headers = fromNodeHeaders(nodeHeaders)
    const authorization = headers.get('authorization')
    if (!authorization?.startsWith('Bearer ')) return null
    const token = authorization.slice('Bearer '.length).trim()
    if (!token) return null

    try {
      const resourceClient = createResourceClient(this.options.auth)
      const payload = await resourceClient.verifyAccessToken(token, {
        verifyOptions: {
          issuer: getAuthIssuer(),
          audience: getApiOrigin(),
        },
      })

      if (!payload.sub) return null

      const user = await this.em.findOne(User, { id: payload.sub })
      if (!user) {
        this.logger.warn(`OAuth access token subject ${payload.sub} has no matching user`)
        return null
      }

      const scopes = typeof payload.scope === 'string' ? payload.scope.split(' ') : []
      return { user: user as unknown as ReqUser, scopes }
    } catch (error) {
      this.logger.error(
        'Bearer token authentication failed',
        error instanceof Error ? error.stack : error,
      )
      return null
    }
  }

  /**
   * Attempts to authenticate the request using an API key from the `x-api-key` header.
   * Returns the owning user if valid, or null if no key is present or the key is invalid.
   */
  private async authenticateViaApiKey(nodeHeaders: any): Promise<ReqUser | null> {
    const headers = fromNodeHeaders(nodeHeaders)
    const apiKey = headers.get('x-api-key')
    if (!apiKey) return null

    try {
      const result = await this.options.auth.api.verifyApiKey({ body: { key: apiKey } })
      if (!result?.valid || !result.key?.referenceId) return null

      const user = await this.em.findOne(User, { id: result.key.referenceId })
      if (!user) {
        this.logger.warn(`API key referenceId ${result.key.referenceId} has no matching user`)
        return null
      }
      return user as unknown as ReqUser
    } catch (error) {
      this.logger.error(
        'API key authentication failed',
        error instanceof Error ? error.stack : error,
      )
      return null
    }
  }

  /**
   * Checks if a role value matches any of the required roles
   * Handles both array and comma-separated string role formats
   * @param role - The role value to check (string, array, or undefined)
   * @param requiredRoles - Array of roles that grant access
   * @returns True if the role matches any required role
   */
  private matchesRequiredRole(
    role: string | string[] | undefined,
    requiredRoles: string[],
  ): boolean {
    if (!role) return false

    if (Array.isArray(role)) {
      return role.some((r) => requiredRoles.includes(r))
    }

    if (typeof role === 'string') {
      return role.split(',').some((r) => requiredRoles.includes(r.trim()))
    }

    return false
  }

  /**
   * Fetches the user's role within an organization from the member table
   * Uses Better Auth's organization plugin API if available
   * @param headers - The request headers containing session cookies
   * @returns The member's role in the organization, or undefined if not found
   */
  private async getMemberRoleInOrganization(headers: Headers): Promise<string | undefined> {
    try {
      // Better Auth organization plugin exposes getActiveMemberRole or getActiveMember API
      // biome-ignore lint/suspicious/noExplicitAny: Better Auth API types vary by plugin configuration
      const authApi = this.options.auth.api as any

      // Try getActiveMemberRole first (most direct for our use case)
      if (typeof authApi.getActiveMemberRole === 'function') {
        const result = await authApi.getActiveMemberRole({ headers })
        return result?.role
      }

      // Fallback: try getActiveMember
      if (typeof authApi.getActiveMember === 'function') {
        const member = await authApi.getActiveMember({ headers })
        return member?.role
      }

      return undefined
      // oxlint-disable-next-line no-useless-catch
    } catch (error) {
      // Re-throw to surface organization plugin errors
      throw error
    }
  }

  /**
   * Checks if the user has any of the required roles in their organization.
   * Used by @OrgRoles() decorator for organization-level role checks.
   * Requires an active organization in the session.
   * @param session - The user's session
   * @param headers - The request headers for API calls
   * @param requiredRoles - Array of roles that grant access
   * @returns True if org member role matches any required role
   */
  private async checkOrgRole(
    session: UserSession,
    headers: Headers,
    requiredRoles: string[],
  ): Promise<boolean> {
    const activeOrgId = session.session?.activeOrganizationId
    if (!activeOrgId) {
      return false
    }

    try {
      const memberRole = await this.getMemberRoleInOrganization(headers)
      return this.matchesRequiredRole(memberRole, requiredRoles)
    } catch (error) {
      // Log error for debugging but return false to trigger 403 Forbidden
      // instead of letting the error propagate as a 500
      // oxlint-disable-next-line no-console
      console.error('Organization plugin error:', error)
      return false
    }
  }
}

export const AuthUser = createParamDecorator(
  (data: keyof ReqUser | undefined, ctx: ExecutionContext) => {
    const request = getRequestFromContext(ctx)
    const session = request.session as UserSession
    const user: ReqUser | null = session?.user ?? (request.user as ReqUser | null) ?? null

    return data ? user?.[data] : user
  },
)
