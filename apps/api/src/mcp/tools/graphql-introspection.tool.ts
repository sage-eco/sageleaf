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
        'specific type name (e.g. "Query", "Item", "SearchType") or an array of type names to ' +
        'get just those definitions - much shorter, prefer this once you know what you are ' +
        'looking for.',
      inputSchema: {
        typeName: z
          .union([z.string(), z.array(z.string())])
          .optional()
          .describe(
            'A type name or array of type names to print (e.g. "Query" or ["Item", ' +
              '"ItemInput"]). Omit for the full schema.',
          ),
      },
    },
    async ({ typeName }) => {
      const names = typeof typeName === 'string' ? [typeName] : typeName

      if (!names || names.length === 0) {
        return textResult(printSchema(ctx.schema))
      }

      const notFound: string[] = []
      const printed: string[] = []
      for (const name of names) {
        const type = ctx.schema.getType(name)
        if (!type) {
          notFound.push(name)
        } else {
          printed.push(printType(type))
        }
      }

      if (printed.length === 0) {
        return errorResult(`Type(s) not found in the schema: ${notFound.join(', ')}`)
      }

      const notFoundNote =
        notFound.length > 0 ? `\n\n(Not found in schema: ${notFound.join(', ')})` : ''
      return textResult(printed.join('\n\n') + notFoundNote)
    },
  )
}
