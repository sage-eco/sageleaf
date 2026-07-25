import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { printSchema, printType } from 'graphql'
import { z } from 'zod/v4'

import { errorResult, McpToolContext, textResult } from '@src/mcp/mcp.types'

export function registerGraphqlIntrospectionTool(server: McpServer, ctx: McpToolContext) {
  server.registerTool(
    'graphql_introspection',
    {
      description:
        'Inspect the Sage GraphQL schema as SDL (types, fields, args, enums) so you can write ' +
        'correct queries for graphql_query. Omit "typeName" to get the entire schema; pass a ' +
        'specific type name (e.g. "Query", "Item", "SearchType") to get just that definition - ' +
        'much shorter, prefer this once you know what you are looking for.',
      inputSchema: {
        typeName: z
          .string()
          .optional()
          .describe(
            'A specific type name to print (e.g. "Query", "Item"). Omit for the full schema.',
          ),
      },
    },
    async ({ typeName }) => {
      if (!typeName) {
        return textResult(printSchema(ctx.schema))
      }

      const type = ctx.schema.getType(typeName)
      if (!type) {
        return errorResult(`Type "${typeName}" not found in the schema.`)
      }
      return textResult(printType(type))
    },
  )
}
