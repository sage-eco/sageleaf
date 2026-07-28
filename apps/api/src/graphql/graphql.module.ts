import { IncomingMessage } from 'http'
import { join } from 'path'

import ApolloServerPluginResponseCache from '@apollo/server-plugin-response-cache'
import { ApolloServerPluginCacheControl } from '@apollo/server/plugin/cacheControl'
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default'
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo'
import { DynamicModule, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { Int, GraphQLModule as NestGraphQLModule } from '@nestjs/graphql'
import { fromNodeHeaders } from 'better-auth/node'
import { DirectiveLocation, GraphQLBoolean, GraphQLDirective } from 'graphql'
import type { GraphQLFormattedError } from 'graphql'
import { JSONObjectDefinition, JSONObjectResolver } from 'graphql-scalars'
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs'

import { AuthModule } from '@src/auth/auth.module'
import { AuthService } from '@src/auth/auth.service'
import { LuxonDateTimeResolver } from '@src/common/datetime.model'
import { CacheControlScopeEnum } from '@src/graphql/cache-control'
import { createGraphQLCache } from '@src/graphql/graphql-cache'
import { Context, IncomingMessageWithAuthCode } from '@src/graphql/graphql.context'
import { RateLimitModule } from '@src/rate-limit/rate-limit.module'
import { RateLimitPlugin } from '@src/rate-limit/rate-limit.plugin'

@Module({})
export class GraphQLModule {
  static register(): DynamicModule {
    const graphQL = NestGraphQLModule.forRootAsync({
      driver: ApolloDriver,
      imports: [ConfigModule, AuthModule],
      inject: [ConfigService, AuthService],

      useFactory: (configService: ConfigService, authService: AuthService): ApolloDriverConfig => {
        const context: Context = {}
        const cache = createGraphQLCache(configService)

        const getSessionId = async (req?: IncomingMessageWithAuthCode): Promise<string | null> => {
          if (!req?.headers.cookie) return null
          try {
            const session = await authService.api.getSession({
              headers: fromNodeHeaders(req.headers),
            })
            return session?.session.id ?? null
          } catch {
            return null
          }
        }

        return {
          autoSchemaFile: join(process.cwd(), 'schema/schema.gql'),
          cache,
          context: ({ req }: { req: IncomingMessage }) => {
            context.req = req
            return context
          },
          buildSchemaOptions: {
            directives: [
              new GraphQLDirective({
                args: {
                  inheritMaxAge: {
                    type: GraphQLBoolean,
                  },
                  maxAge: {
                    type: Int,
                  },
                  scope: {
                    type: CacheControlScopeEnum,
                  },
                },
                locations: [
                  DirectiveLocation.FIELD_DEFINITION,
                  DirectiveLocation.OBJECT,
                  DirectiveLocation.INTERFACE,
                  DirectiveLocation.UNION,
                ],
                name: 'cacheControl',
              }),
            ],
            scalarsMap: [{ type: () => JSONObjectDefinition, scalar: JSONObjectResolver }],
          },
          sortSchema: true,
          playground: false,
          // Required when using graphql-upload: multipart requests must include
          // the Apollo-Require-Preflight header or they will be rejected.
          csrfPrevention: true,
          plugins: [
            ApolloServerPluginLandingPageLocalDefault({
              embed: {
                endpointIsEditable: false,
              },
              includeCookies: true,
            }),
            ApolloServerPluginCacheControl({ defaultMaxAge: 300 }),
            ApolloServerPluginResponseCache({
              cache,
              shouldWriteToCache: async (requestContext) =>
                requestContext.operation?.operation === 'query',
              sessionId: async (requestContext) =>
                getSessionId((requestContext.contextValue as Context).req),
              // Changing the requested language(s) should invalidate the cache
              extraCacheKeyData: async (requestContext) =>
                (requestContext.contextValue as Context).req?.headers['accept-language'] ?? null,
            }),
          ],
          introspection: true,
          hideSchemaDetailsFromClientErrors: false,
          resolvers: {
            DateTime: LuxonDateTimeResolver,
            JSONObject: JSONObjectResolver,
            Upload: GraphQLUpload,
          },
          formatError: (err: GraphQLFormattedError) => GraphQLModule.formatError(err),
        }
      },
    })

    return {
      module: GraphQLModule,
      imports: [graphQL, AuthModule, RateLimitModule],
      providers: [RateLimitPlugin],
      exports: [graphQL],
    }
  }

  private static formatError(error: GraphQLFormattedError): GraphQLFormattedError {
    if (!['PRODUCTION', 'TEST'].includes((process.env.NODE_ENV || '').toUpperCase())) {
      // oxlint-disable-next-line no-console
      console.error('GraphQL Error:', error)
    }
    if (process.env.NODE_ENV === 'production') {
      delete error.extensions?.stacktrace
    }
    return error
  }
}
