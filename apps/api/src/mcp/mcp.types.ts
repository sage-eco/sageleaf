import type { ApolloServer, BaseContext } from '@apollo/server'
import type { Request } from 'express'
import type { GraphQLSchema } from 'graphql'

import { ReqUser } from '@src/auth/auth.guard'
import { ChangeStatus } from '@src/changes/change.entity'
import { ChangeSchemaService } from '@src/changes/change.schema'
import { ChangeService } from '@src/changes/change.service'
import { RefEditService } from '@src/changes/ref-edit.service'
import { SourceSchemaService } from '@src/changes/source.schema'
import { SourceService } from '@src/changes/source.service'
import { TransformService } from '@src/common/transform'
import { PlaceSchemaService } from '@src/geo/place.schema'
import { PlaceService } from '@src/geo/place.service'
import { ComponentSchemaService } from '@src/process/component.schema'
import { ComponentService } from '@src/process/component.service'
import { ProcessSchemaService } from '@src/process/process.schema'
import { ProcessService } from '@src/process/process.service'
import { ProgramSchemaService } from '@src/process/program.schema'
import { ProgramService } from '@src/process/program.service'
import { CategorySchemaService } from '@src/product/category.schema'
import { CategoryService } from '@src/product/category.service'
import { ItemSchemaService } from '@src/product/item.schema'
import { ItemService } from '@src/product/item.service'
import { VariantSchemaService } from '@src/product/variant.schema'
import { VariantService } from '@src/product/variant.service'
import { SearchService } from '@src/search/search.service'
import { OrgSchemaService } from '@src/users/org.schema'
import { OrgService } from '@src/users/org.service'

export interface McpToolContext {
  userID: string
  reqUser: ReqUser
  /** The raw Express request already authenticated by the global AuthGuard - reused as the
   * GraphQL contextValue so graphql_query's in-process execution runs under the same identity. */
  rawReq: Request
  schema: GraphQLSchema
  /** Used to run graphql_query through Apollo's real plugin pipeline (rate limiting, caching,
   * error formatting) instead of calling graphql-js's execute() directly against the schema. */
  apolloServer: ApolloServer<BaseContext>
  transform: TransformService
  changeService: ChangeService
  changeSchemaService: ChangeSchemaService
  refEditService: RefEditService
  sourceService: SourceService
  sourceSchemaService: SourceSchemaService
  searchService: SearchService
  itemService: ItemService
  itemSchemaService: ItemSchemaService
  processService: ProcessService
  processSchemaService: ProcessSchemaService
  variantService: VariantService
  variantSchemaService: VariantSchemaService
  categoryService: CategoryService
  categorySchemaService: CategorySchemaService
  placeService: PlaceService
  placeSchemaService: PlaceSchemaService
  orgService: OrgService
  orgSchemaService: OrgSchemaService
  componentService: ComponentService
  componentSchemaService: ComponentSchemaService
  programService: ProgramService
  programSchemaService: ProgramSchemaService
}

export interface McpToolTextResult {
  [key: string]: unknown
  content: { type: 'text'; text: string }[]
  isError?: boolean
  structuredContent?: Record<string, unknown>
}

export function textResult(value: unknown): McpToolTextResult {
  return {
    content: [
      { type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value, null, 2) },
    ],
  }
}

export function structuredResult(value: Record<string, unknown>): McpToolTextResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  }
}

export function errorResult(message: string): McpToolTextResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  }
}

/**
 * Recursively replaces string values that are exactly "[]" or "{}" with a real empty array/object.
 * Defends against MCP clients that stringify empty collections when the tool's input schema (a
 * generic z.record for entity-specific "data") gives no per-field type hints. Scoped to exact-match
 * empty literals only - it must not attempt general JSON-string parsing, which could corrupt
 * legitimate string values.
 */
export function normalizeEmptyCollectionStrings(value: unknown): unknown {
  if (value === '[]') return []
  if (value === '{}') return {}
  if (Array.isArray(value)) {
    return value.map((item) => normalizeEmptyCollectionStrings(item))
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(value)) {
      result[key] = normalizeEmptyCollectionStrings(val)
    }
    return result
  }
  return value
}

export async function assertChangeIsDraft(
  changeService: ChangeService,
  changeID: string,
): Promise<{ ok: true } | { ok: false; error: McpToolTextResult }> {
  const change = await changeService.findOne(changeID)
  if (change.status !== ChangeStatus.DRAFT) {
    return {
      ok: false,
      error: errorResult(
        `Change "${changeID}" is not in DRAFT status (currently ${change.status}). Move it back to DRAFT with edit_change before proposing further edits.`,
      ),
    }
  }
  return { ok: true }
}
