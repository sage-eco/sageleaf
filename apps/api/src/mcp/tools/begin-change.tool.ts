import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z, ZodError } from 'zod/v4'

import { CreateChangeInput } from '@src/changes/change-ext.model'
import { ChangeStatus } from '@src/changes/change.entity'
import { errorResult, McpToolContext, textResult } from '@src/mcp/mcp.types'

export function registerBeginChangeTool(server: McpServer, ctx: McpToolContext) {
  server.registerTool(
    'begin_change',
    {
      description:
        'Create a new Change container to hold a set of draft edits. Every write made through ' +
        'propose_edit/propose_refs must be attached to a Change created here. The change starts in ' +
        'DRAFT status - keep using propose_edit/propose_refs to build it up, then use edit_change to ' +
        'move it to PROPOSED when ready for human review.',
      inputSchema: {
        title: z.string().max(1000).optional().describe('Short title for the change.'),
        description: z
          .string()
          .max(100000)
          .optional()
          .describe('Longer description of the change.'),
      },
    },
    async (input) => {
      try {
        const parsed = await ctx.changeSchemaService.parseCreateInput(input as CreateChangeInput)
        const change = await ctx.changeService.create(parsed, ctx.userID)
        return textResult({ changeID: change.id, status: ChangeStatus.DRAFT, title: change.title })
      } catch (error) {
        if (error instanceof ZodError) {
          return errorResult(`Invalid input: ${error.message}`)
        }
        throw error
      }
    },
  )
}
