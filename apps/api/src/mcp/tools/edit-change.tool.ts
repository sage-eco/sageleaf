import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z, ZodError } from 'zod/v4'

import { UpdateChangeInput } from '@src/changes/change.model'
import { errorResult, McpToolContext, textResult } from '@src/mcp/mcp.types'

export function registerEditChangeTool(server: McpServer, ctx: McpToolContext) {
  server.registerTool(
    'edit_change',
    {
      description:
        "Update a Change's metadata (title/description/sources) and/or move its status between " +
        'DRAFT and PROPOSED. Moving to PROPOSED signals the change is ready for human review and ' +
        'locks it: propose_edit/propose_refs will refuse further edits until it is moved back to ' +
        'DRAFT. This tool cannot set APPROVED/REJECTED/MERGED - those happen through the human ' +
        'review/merge flow, not MCP.',
      inputSchema: {
        changeID: z.string().min(1).describe('The Change ID to update.'),
        title: z.string().max(1000).optional(),
        description: z.string().max(255).optional(),
        status: z.enum(['DRAFT', 'PROPOSED']).optional(),
        sources: z.array(z.string()).optional().describe('Full replacement list of source IDs.'),
      },
    },
    async ({ changeID, title, description, status, sources }) => {
      try {
        const parsed = await ctx.changeSchemaService.parseUpdateInput({
          id: changeID,
          title,
          description,
          status,
          sources,
        } as UpdateChangeInput)
        const change = await ctx.changeService.update(parsed)
        return textResult({ changeID: change.id, status: change.status, title: change.title })
      } catch (error) {
        if (error instanceof ZodError) {
          return errorResult(`Invalid input: ${error.message}`)
        }
        throw error
      }
    },
  )
}
