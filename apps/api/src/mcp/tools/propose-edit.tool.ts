import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z, ZodError } from 'zod/v4'

import { EditModelType } from '@src/changes/change.enum'
import { Change } from '@src/changes/change.model'
import { Place } from '@src/geo/place.model'
import {
  assertChangeIsDraft,
  errorResult,
  McpToolContext,
  normalizeEmptyCollectionStrings,
  textResult,
} from '@src/mcp/mcp.types'
import { Component } from '@src/process/component.model'
import { Process } from '@src/process/process.model'
import { Program } from '@src/process/program.model'
import { Category } from '@src/product/category.model'
import { Item } from '@src/product/item.model'
import { Variant } from '@src/product/variant.model'
import { Org } from '@src/users/org.model'

// Material has no create/update mutation anywhere in this app (it isn't a valid `model` for
// ref edits either) - it's read-only, same as Region, so it's intentionally absent here.
export const MODEL_BY_EDIT_TYPE: Partial<Record<EditModelType, new () => any>> = {
  [EditModelType.Place]: Place,
  [EditModelType.Org]: Org,
  [EditModelType.Component]: Component,
  [EditModelType.Process]: Process,
  [EditModelType.Program]: Program,
  [EditModelType.Category]: Category,
  [EditModelType.Item]: Item,
  [EditModelType.Variant]: Variant,
}

type DispatchEntry = {
  model: new () => any
  schemaService: {
    parseCreateInput(input: any): Promise<any>
    parseUpdateInput(input: any): Promise<any>
  }
  entityService: {
    create(input: any, userID: string): Promise<any>
    update(input: any, userID: string): Promise<any>
  }
}

function buildDispatch(ctx: McpToolContext): Partial<Record<EditModelType, DispatchEntry>> {
  return {
    [EditModelType.Place]: {
      model: MODEL_BY_EDIT_TYPE[EditModelType.Place]!,
      schemaService: ctx.placeSchemaService,
      entityService: ctx.placeService,
    },
    [EditModelType.Org]: {
      model: MODEL_BY_EDIT_TYPE[EditModelType.Org]!,
      schemaService: ctx.orgSchemaService,
      entityService: ctx.orgService,
    },
    [EditModelType.Component]: {
      model: MODEL_BY_EDIT_TYPE[EditModelType.Component]!,
      schemaService: ctx.componentSchemaService,
      entityService: ctx.componentService,
    },
    [EditModelType.Process]: {
      model: MODEL_BY_EDIT_TYPE[EditModelType.Process]!,
      schemaService: ctx.processSchemaService,
      entityService: ctx.processService,
    },
    [EditModelType.Program]: {
      model: MODEL_BY_EDIT_TYPE[EditModelType.Program]!,
      schemaService: ctx.programSchemaService,
      entityService: ctx.programService,
    },
    [EditModelType.Category]: {
      model: MODEL_BY_EDIT_TYPE[EditModelType.Category]!,
      schemaService: ctx.categorySchemaService,
      entityService: ctx.categoryService,
    },
    [EditModelType.Item]: {
      model: MODEL_BY_EDIT_TYPE[EditModelType.Item]!,
      schemaService: ctx.itemSchemaService,
      entityService: ctx.itemService,
    },
    [EditModelType.Variant]: {
      model: MODEL_BY_EDIT_TYPE[EditModelType.Variant]!,
      schemaService: ctx.variantSchemaService,
      entityService: ctx.variantService,
    },
  }
}

export function registerProposeEditTool(server: McpServer, ctx: McpToolContext) {
  const dispatch = buildDispatch(ctx)

  server.registerTool(
    'propose_edit',
    {
      description:
        'Create or update an entity (Place, Org, Component, Process, Program, Category, Item, or ' +
        'Variant) as a draft edit tied to a Change created with begin_change. This never mutates ' +
        'live data directly - it stages an edit inside the Change for human review, exactly like a ' +
        'human editor using the web UI. The Change must be in DRAFT status (see begin_change / ' +
        'edit_change); once PROPOSED, this tool refuses further edits until moved back to DRAFT. For ' +
        'mode "update", "data" must include the entity "id". Material is read-only (like Region) - ' +
        'it has no create/update mutation in this app. IDs returned by an earlier "create" call in ' +
        'the same DRAFT Change can be referenced immediately by later propose_edit/propose_refs ' +
        'calls in that Change - there is no need to merge the Change first. Array fields must be ' +
        'passed as real arrays (use [] to clear an existing array); a stringified empty collection ' +
        '("[]" or "{}") is defensively unwrapped as a safety net, but do not rely on this for ' +
        'non-empty values. A language code is required for any translatable text input (e.g. ' +
        'name, desc) - resolve it via the "Accept-Language" HTTP header or a "lang" (or ' +
        '"locale") query parameter on the request; omitting it causes text fields to fail with ' +
        '"A language code is required for text input...".',
      inputSchema: {
        model: z
          .enum(EditModelType)
          .describe(
            'Which entity type to create or update. Material is not supported - read-only.',
          ),
        mode: z.enum(['create', 'update']),
        changeID: z
          .string()
          .min(1)
          .describe('The Change (from begin_change) this edit is attached to. Must be DRAFT.'),
        data: z
          .record(z.string(), z.unknown())
          .describe(
            "Entity-specific fields matching the model's Create/Update input (e.g. name, desc). " +
              'For mode "update", must include "id". Phone numbers (e.g. social.phones[].phoneNumber) ' +
              'must be E.164 format strings: a "+" followed by the country code and number, e.g. ' +
              '"+14018216400".',
          ),
      },
    },
    async ({ model, mode, changeID, data }) => {
      const draftCheck = await assertChangeIsDraft(ctx.changeService, changeID)
      if (!draftCheck.ok) return draftCheck.error

      const entry = dispatch[model]
      if (!entry) return errorResult(`Unsupported model type "${model}"`)

      const resultKey = model.toLowerCase()

      const normalizedData = normalizeEmptyCollectionStrings(data) as Record<string, unknown>

      try {
        if (mode === 'create') {
          const parsed = await entry.schemaService.parseCreateInput({
            ...normalizedData,
            changeID,
          })
          const result = await entry.entityService.create(parsed, ctx.userID)
          return await formatResult(ctx, entry.model, resultKey, result)
        }

        if (!('id' in normalizedData) || typeof normalizedData.id !== 'string') {
          return errorResult('mode "update" requires "id" in data')
        }
        const parsed = await entry.schemaService.parseUpdateInput({
          ...normalizedData,
          changeID,
        })
        const result = await entry.entityService.update(parsed, ctx.userID)
        return await formatResult(ctx, entry.model, resultKey, result)
      } catch (error) {
        if (error instanceof ZodError) {
          return errorResult(`Invalid input: ${error.message}`)
        }
        throw error
      }
    },
  )
}

async function formatResult(
  ctx: McpToolContext,
  model: new () => any,
  resultKey: string,
  result: Record<string, any>,
) {
  const entity = result[resultKey]
  const change = result.change

  return textResult({
    entity: entity ? await ctx.transform.entityToModel(model, entity) : undefined,
    change: change ? await ctx.transform.entityToModel(Change, change) : undefined,
  })
}
