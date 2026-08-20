import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { McpToolContext } from '@src/mcp/mcp.types'
import { registerBeginChangeTool } from '@src/mcp/tools/begin-change.tool'
import { registerCreateSourceTool } from '@src/mcp/tools/create-source.tool'
import { registerEditChangeTool } from '@src/mcp/tools/edit-change.tool'
import { registerGraphqlIntrospectionTool } from '@src/mcp/tools/graphql-introspection.tool'
import { registerGraphqlQueryTool } from '@src/mcp/tools/graphql-query.tool'
import { registerProposeEditTool } from '@src/mcp/tools/propose-edit.tool'
import { registerProposeRefsTool } from '@src/mcp/tools/propose-refs.tool'
import { registerSearchCatalogTool } from '@src/mcp/tools/search-catalog.tool'
import { registerWhoamiTool } from '@src/mcp/tools/whoami.tool'

export function buildMcpServer(ctx: McpToolContext): McpServer {
  const server = new McpServer({ name: 'sage-api', version: '1.0.0' })

  registerWhoamiTool(server, ctx)
  registerSearchCatalogTool(server, ctx)
  registerGraphqlQueryTool(server, ctx)
  registerGraphqlIntrospectionTool(server, ctx)

  registerBeginChangeTool(server, ctx)
  registerEditChangeTool(server, ctx)
  registerCreateSourceTool(server, ctx)
  registerProposeEditTool(server, ctx)
  registerProposeRefsTool(server, ctx)

  return server
}
