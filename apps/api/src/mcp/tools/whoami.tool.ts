import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { McpToolContext, textResult } from '@src/mcp/mcp.types'

export function registerWhoamiTool(server: McpServer, ctx: McpToolContext) {
  server.registerTool(
    'whoami',
    {
      description:
        'Return the identity of the currently authenticated user making this MCP request.',
      inputSchema: {},
    },
    async () => {
      return textResult({
        id: ctx.reqUser.id,
        name: ctx.reqUser.name,
        email: ctx.reqUser.email,
      })
    },
  )
}
