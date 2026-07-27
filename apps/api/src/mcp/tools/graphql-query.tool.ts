import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { parse } from 'graphql'
import { z } from 'zod/v4'

import { errorResult, McpToolContext } from '@src/mcp/mcp.types'

export function registerGraphqlQueryTool(server: McpServer, ctx: McpToolContext) {
  server.registerTool(
    'graphql_query',
    {
      description:
        'Run a read-only GraphQL query against the Sage API - the same schema, resolvers, rate ' +
        'limiting, and caching the web app uses. Runs as the currently authenticated user, subject ' +
        'to the same field-level permissions as the rest of the API. Only "query" operations are ' +
        'accepted - mutations and subscriptions are rejected. Use graphql_introspection first if ' +
        'you need to see the schema (types, fields, args) before writing a query. For writes, use ' +
        'begin_change / edit_change / propose_edit / propose_refs instead - those are the only ' +
        'write path exposed here, and every write goes through the Change/Edit human-review ' +
        'workflow rather than mutating live data.',
      inputSchema: {
        query: z
          .string()
          .min(1)
          .describe('A GraphQL document containing one or more query operations.'),
        variables: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Variables referenced by the query.'),
        operationName: z
          .string()
          .optional()
          .describe('Required only if "query" defines more than one named operation.'),
      },
    },
    async ({ query, variables, operationName }) => {
      try {
        const document = parse(query)
        const nonQueryOp = document.definitions.find(
          (def) => def.kind === 'OperationDefinition' && def.operation !== 'query',
        )
        if (nonQueryOp) {
          return errorResult(
            'Only "query" operations are allowed through graphql_query. Mutations and ' +
              'subscriptions are rejected - use begin_change/edit_change/propose_edit/propose_refs ' +
              'for writes.',
          )
        }
      } catch (error) {
        return errorResult(`GraphQL syntax error: ${(error as Error).message}`)
      }

      const response = await ctx.apolloServer.executeOperation(
        { query, variables, operationName },
        { contextValue: { req: ctx.rawReq } },
      )

      if (response.body.kind !== 'single') {
        return errorResult('Incremental delivery responses (@defer/@stream) are not supported.')
      }

      const { data, errors } = response.body.singleResult
      return {
        content: [{ type: 'text', text: JSON.stringify({ data, errors }, null, 2) }],
        isError: Boolean(errors?.length),
      }
    },
  )
}
