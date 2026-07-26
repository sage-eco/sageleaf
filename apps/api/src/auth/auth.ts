import { apiKey } from '@better-auth/api-key'
import { oauthProvider } from '@better-auth/oauth-provider'
import { MikroORM } from '@mikro-orm/postgresql'
import { betterAuth } from 'better-auth'
import { admin, jwt, organization, username } from 'better-auth/plugins'
import { Kysely } from 'kysely'
import { KyselyKnexDialect, PGColdDialect } from 'kysely-knex'

import { DateCoercionKyselyPlugin } from '@src/auth/date-coercion-kysely.plugin'
import { getApiOrigin } from '@src/auth/oauth.constants'
import { reservedUsernames } from '@src/auth/reserved-usernames'
import { isProd } from '@src/common/common.utils'

export const configureAuth = (orm: MikroORM) => {
  const conn = orm.em.getConnection()
  const knex = conn.getKnex()
  return betterAuth({
    basePath: '/auth',
    database: {
      db: new Kysely({
        dialect: new KyselyKnexDialect({
          knex,
          kyselySubDialect: new PGColdDialect(),
        }),
        plugins: [new DateCoercionKyselyPlugin()],
      }),
      type: 'postgres',
      transaction: true,
    },
    plugins: [
      username({
        minUsernameLength: 4,
        maxUsernameLength: 32,
        usernameValidator: (username) => {
          if (isProd() && reservedUsernames.includes(username)) {
            return false
          }
          return /^[a-zA-Z0-9_]+$/.test(username)
        },
        schema: {
          user: {
            modelName: 'users',
            fields: {
              displayUsername: 'display_username',
            },
          },
        },
      }),
      organization({
        schema: {
          session: {
            fields: {
              activeOrganizationId: 'active_organization_id',
            },
          },
          organization: {
            modelName: 'orgs',
            fields: {
              createdAt: 'created_at',
              updatedAt: 'updated_at',
              logo: 'avatar_url',
            },
          },
          member: {
            modelName: 'users_orgs',
            fields: {
              createdAt: 'created_at',
              updatedAt: 'updated_at',
              userId: 'user_id',
              organizationId: 'org_id',
            },
          },
          invitation: {
            modelName: 'invitations',
            fields: {
              createdAt: 'created_at',
              updatedAt: 'updated_at',
              inviterId: 'inviter_id',
              organizationId: 'org_id',
              expiresAt: 'expires_at',
            },
          },
        },
      }),
      admin(),
      apiKey({
        enableMetadata: true,
        schema: {
          apikey: {
            modelName: 'auth.apikey',
            fields: {
              createdAt: 'created_at',
              updatedAt: 'updated_at',
              configId: 'config_id',
              referenceId: 'reference_id',
              refillInterval: 'refill_interval',
              refillAmount: 'refill_amount',
              lastRefillAt: 'last_refill_at',
              rateLimitEnabled: 'rate_limit_enabled',
              rateLimitTimeWindow: 'rate_limit_time_window',
              rateLimitMax: 'rate_limit_max',
              requestCount: 'request_count',
              lastRequest: 'last_request',
              expiresAt: 'expires_at',
            },
          },
        },
      }),
      jwt({
        schema: {
          jwks: {
            modelName: 'auth.jwks',
            fields: {
              publicKey: 'public_key',
              privateKey: 'private_key',
              createdAt: 'created_at',
              expiresAt: 'expires_at',
            },
          },
        },
      }),
      oauthProvider({
        loginPage: isProd()
          ? 'https://sageleaf.app/profile/sign_in'
          : 'https://dev.sageleaf.app/profile/sign_in',
        consentPage: isProd()
          ? 'https://sageleaf.app/oauth/consent'
          : 'https://dev.sageleaf.app/oauth/consent',
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
        scopes: ['openid', 'profile', 'email', 'offline_access'],
        validAudiences: [getApiOrigin()],
        schema: {
          oauthClient: {
            modelName: 'auth.oauth_clients',
            fields: {
              clientId: 'client_id',
              clientSecret: 'client_secret',
              subjectType: 'subject_type',
              userId: 'user_id',
              createdAt: 'created_at',
              updatedAt: 'updated_at',
              softwareId: 'software_id',
              softwareVersion: 'software_version',
              softwareStatement: 'software_statement',
              redirectUris: 'redirect_uris',
              postLogoutRedirectUris: 'post_logout_redirect_uris',
              tokenEndpointAuthMethod: 'token_endpoint_auth_method',
              grantTypes: 'grant_types',
              responseTypes: 'response_types',
              requirePKCE: 'require_pkce',
              referenceId: 'reference_id',
              enableEndSession: 'enable_end_session',
              skipConsent: 'skip_consent',
            },
          },
          oauthRefreshToken: {
            modelName: 'auth.oauth_refresh_tokens',
            fields: {
              clientId: 'client_id',
              sessionId: 'session_id',
              userId: 'user_id',
              referenceId: 'reference_id',
              expiresAt: 'expires_at',
              createdAt: 'created_at',
              authTime: 'auth_time',
            },
          },
          oauthAccessToken: {
            modelName: 'auth.oauth_access_tokens',
            fields: {
              clientId: 'client_id',
              sessionId: 'session_id',
              userId: 'user_id',
              referenceId: 'reference_id',
              refreshId: 'refresh_id',
              expiresAt: 'expires_at',
              createdAt: 'created_at',
            },
          },
          oauthConsent: {
            modelName: 'auth.oauth_consents',
            fields: {
              clientId: 'client_id',
              userId: 'user_id',
              referenceId: 'reference_id',
              createdAt: 'created_at',
              updatedAt: 'updated_at',
            },
          },
        },
      }),
    ],
    user: {
      modelName: 'users',
      fields: {
        emailVerified: 'email_verified',
        image: 'avatar_url',
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        displayUsername: 'display_username',
        banReason: 'ban_reason',
        banExpires: 'ban_expires',
        organizations: 'orgs',
      },
      additionalFields: {
        lang: {
          type: 'string',
          required: false,
          defaultValue: 'en',
        },
      },
    },
    session: {
      modelName: 'auth.sessions',
      fields: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        expiresAt: 'expires_at',
        ipAddress: 'ip_address',
        userAgent: 'user_agent',
        userId: 'user_id',
      },
      cookieCache: {
        enabled: true,
        maxAge: 10 * 60,
      },
    },
    account: {
      modelName: 'auth.accounts',
      fields: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        accountId: 'account_id',
        providerId: 'provider_id',
        accessToken: 'access_token',
        refreshToken: 'refresh_token',
        accessTokenExpiresAt: 'access_token_expires_at',
        refreshTokenExpiresAt: 'refresh_token_expires_at',
        idToken: 'id_token',
        userId: 'user_id',
      },
      accountLinking: {
        enabled: true,
        allowDifferentEmails: true,
      },
    },
    verification: {
      modelName: 'auth.verifications',
      fields: {
        createdAt: 'created_at',
        updatedAt: 'updated_at',
        expiresAt: 'expires_at',
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
    },
    socialProviders: {
      google: process.env.GOOGLE_CLIENT_ID
        ? {
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          }
        : undefined,
    },
    trustedOrigins: isProd()
      ? [
          'https://sageleaf.app',
          'https://dev.sageleaf.app',
          'https://science.sageleaf.app',
          'https://science.dev.sageleaf.app',
          'http://localhost:*',
          'http://127.0.0.1:*',
          'https://tauri.localhost',
          'http://tauri.localhost',
          'tauri://localhost',
        ]
      : [
          'http://localhost:*',
          'http://127.0.0.1:*',
          'https://tauri.localhost',
          'http://tauri.localhost',
          'tauri://localhost',
        ],
    advanced: {
      cookiePrefix: 'sage',
      crossSubDomainCookies: {
        enabled: isProd(),
        domain: isProd() ? '.sageleaf.app' : undefined,
      },
      defaultCookieAttributes: {
        secure: true,
        httpOnly: true,
        sameSite: 'none',
        partitioned: true,
      },
    },
    hooks: {},
  })
}
