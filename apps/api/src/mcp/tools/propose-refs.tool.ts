import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z, ZodError } from 'zod/v4'

import { EditModelType, RefModelType } from '@src/changes/change.enum'
import { AddRefInput } from '@src/changes/ref-edit.model'
import {
  assertChangeIsDraft,
  errorResult,
  McpToolContext,
  normalizeEmptyCollectionStrings,
  textResult,
} from '@src/mcp/mcp.types'
import { MODEL_BY_EDIT_TYPE } from '@src/mcp/tools/propose-edit.tool'

const RefEntrySchema = z.object({
  refModel: z.enum(RefModelType).describe('The type of entity being referenced.'),
  refField: z
    .string()
    .optional()
    .describe('Disambiguates when an entity has multiple ref fields of the same refModel.'),
  ref: z.string().optional().describe('A single referenced entity ID.'),
  refs: z.array(z.string()).optional().describe('Multiple referenced entity IDs.'),
  input: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Extra fields for a single ref (e.g. pivot metadata).'),
  inputs: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Extra fields per ref, aligned with "refs".'),
})

export function registerProposeRefsTool(server: McpServer, ctx: McpToolContext) {
  server.registerTool(
    'propose_refs',
    {
      description:
        'Add relationship edits (e.g. link a Tag, an Item to a Variant) for one entity, as a draft ' +
        'edit tied to a Change created with begin_change. Accepts multiple ref operations for the ' +
        'same entity in one call. The Change must be in DRAFT status - once PROPOSED, this tool ' +
        'refuses further edits until moved back to DRAFT. IDs returned by an earlier "create" call ' +
        'in the same DRAFT Change (via propose_edit) can be referenced immediately here - there is ' +
        'no need to merge the Change first.',
      inputSchema: {
        model: z
          .enum(EditModelType)
          .describe('The type of the entity whose refs are being edited.'),
        id: z.string().min(1).describe('The ID of the entity whose refs are being edited.'),
        changeID: z
          .string()
          .min(1)
          .describe('The Change (from begin_change) this edit is attached to. Must be DRAFT.'),
        refs: z.array(RefEntrySchema).min(1).describe('One or more ref operations to apply.'),
      },
    },
    async ({ model, id, changeID, refs }) => {
      const draftCheck = await assertChangeIsDraft(ctx.changeService, changeID)
      if (!draftCheck.ok) return draftCheck.error

      const modelClass = MODEL_BY_EDIT_TYPE[model]
      if (!modelClass) return errorResult(`Unsupported model type "${model}"`)

      const results = []
      for (const refEntry of refs) {
        try {
          const normalizedEntry = {
            ...refEntry,
            input: refEntry.input
              ? (normalizeEmptyCollectionStrings(refEntry.input) as Record<string, unknown>)
              : refEntry.input,
            inputs: refEntry.inputs
              ? (normalizeEmptyCollectionStrings(refEntry.inputs) as Record<string, unknown>[])
              : refEntry.inputs,
          }
          const parsed = await ctx.changeSchemaService.parseAddRefInput({
            ...normalizedEntry,
            changeID,
          } as AddRefInput)
          const output = await ctx.refEditService.addRef(model, id, parsed, ctx.userID)
          results.push({
            ok: true,
            entity: output.model,
            change: output.change,
          })
        } catch (error) {
          if (error instanceof ZodError) {
            results.push({ ok: false, error: `Invalid input: ${error.message}` })
          } else if (error instanceof Error) {
            results.push({ ok: false, error: error.message })
          } else {
            throw error
          }
        }
      }

      return textResult({ results })
    },
  )
}
