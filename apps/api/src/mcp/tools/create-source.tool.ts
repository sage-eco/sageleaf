import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z, ZodError } from 'zod/v4'

import { SourceType } from '@src/changes/source.entity'
import { Source } from '@src/changes/source.model'
import { errorResult, McpToolContext, textResult } from '@src/mcp/mcp.types'

export function registerCreateSourceTool(server: McpServer, ctx: McpToolContext) {
  server.registerTool(
    'create_source',
    {
      description:
        'Create a Source (a reference used to support data changes, such as a URL, PDF, or ' +
        'image citation). This creates the Source directly - it is not staged inside a Change and ' +
        'is not subject to DRAFT/PROPOSED review. The returned "id" can then be passed to ' +
        '"addSources: [{ id }]" on the "change" input of begin_change/edit_change/propose_edit to ' +
        'attach it as supporting evidence for edits in that Change.',
      inputSchema: {
        type: z.enum(SourceType).describe('The kind of source being cited.'),
        text: z.string().optional().describe('Plain-text content extracted from the source.'),
        contentURL: z.string().optional().describe('URL to the source content, if applicable.'),
        metadata: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Additional metadata about the source (e.g. author, publication date).'),
      },
    },
    async ({ type, text, contentURL, metadata }) => {
      try {
        const parsed = await ctx.sourceSchemaService.parseCreateInput({
          type,
          text,
          contentURL,
          metadata,
        } as any)
        const source = await ctx.sourceService.create(parsed, ctx.userID)
        return textResult({ source: await ctx.transform.entityToModel(Source, source) })
      } catch (error) {
        if (error instanceof ZodError) {
          return errorResult(`Invalid input: ${error.message}`)
        }
        throw error
      }
    },
  )
}
