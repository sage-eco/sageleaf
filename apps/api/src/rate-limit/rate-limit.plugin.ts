import { HeaderMap } from '@apollo/server'
import type { ApolloServerPlugin, GraphQLRequestListener } from '@apollo/server'
import { Plugin } from '@nestjs/apollo'
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { GraphQLSchemaHost } from '@nestjs/graphql'
import { fromNodeHeaders } from 'better-auth/node'
import { GraphQLError } from 'graphql'
import {
  fieldExtensionsEstimator,
  getComplexity,
  simpleEstimator,
} from 'graphql-query-complexity/cjs'

import { AuthService } from '@src/auth/auth.service'
import { Context, IncomingMessageWithAuthCode } from '@src/graphql/graphql.context'
import { RateLimitService } from '@src/rate-limit/rate-limit.service'

@Plugin()
@Injectable()
export class RateLimitPlugin implements ApolloServerPlugin<Context> {
  constructor(
    private gqlSchemaHost: GraphQLSchemaHost,
    private rateLimitService: RateLimitService,
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  async requestDidStart(): Promise<GraphQLRequestListener<Context>> {
    return {
      didResolveOperation: async ({ request, document, contextValue }) => {
        if (this.configService.get('rateLimit.enabled') === false) return

        const complexity = getComplexity({
          schema: this.gqlSchemaHost.schema,
          operationName: request.operationName,
          query: document,
          variables: request.variables,
          estimators: [fieldExtensionsEstimator(), simpleEstimator({ defaultComplexity: 1 })],
        })

        const req = contextValue.req
        const session = await this.getSession(req)
        const tier = session ? 'authenticated' : 'anonymous'
        const identity = session ? `user:${session.user.id}` : `ip:${req?.ip}`

        const { allowed, retryAfterMs } = await this.rateLimitService.consume(
          identity,
          complexity,
          tier,
        )
        if (!allowed) {
          const retryAfterSec = Math.ceil(retryAfterMs / 1000)
          throw new GraphQLError('Rate limit exceeded', {
            extensions: {
              code: 'RATE_LIMITED',
              retryAfterMs,
              http: {
                status: 429,
                headers: new HeaderMap([['retry-after', String(retryAfterSec)]]),
              },
            },
          })
        }
      },
    }
  }

  private async getSession(req?: IncomingMessageWithAuthCode) {
    if (!req?.headers.cookie) return null
    try {
      return await this.authService.api.getSession({ headers: fromNodeHeaders(req.headers) })
    } catch {
      return null
    }
  }
}
