import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod/v4'

import { McpToolContext, structuredResult } from '@src/mcp/mcp.types'
import { SearchType } from '@src/search/search.model'

const QUERY_FILTER_DSL_DOCS = `
The "query" string supports an embedded token:value filter syntax that is parsed out before
free-text search runs. Anything matching "token:value" (or "token:=value", "token:!=value",
"token=value") is stripped from the free text and turned into an exact/comparison filter. Only
use tokens from this table - an unrecognized "word:value" token is silently dropped from BOTH the
filter and the free-text query, contributing nothing:

| token                   | applies to (SearchType) | operators                              |
|-------------------------|--------------------------|-----------------------------------------|
| code                    | variant                  | : := :!= =                              |
| components              | variant                  | : := :!= =                              |
| items                   | variant                  | : := :!= =                              |
| categories              | item                      | : := :!= =                              |
| tags                    | variant, place, item, component | : := :!= =                       |
| placetype               | region                    | : := :!= =                              |
| admin_level             | region                    | : := :!= = > >= < <= (numeric)          |
| technical               | material                  | : := :!= =                              |
| shape                   | material                  | : := :!= =                              |
| ancestors               | material                  | : := :!= =                              |
| technical_descendants   | material                  | : := :!= =                              |

Syntax: "token:value" (contains-match), "token:=value" (exact), "token:!=value" (exact-exclude),
"token=value" (equal). No space between token/operator/value. Quote multi-word values
(tags:"heavy duty"). Example: "code:373933232" is a precise barcode lookup for a variant -
dramatically more reliable than free-text fuzzy matching for that use case.
`.trim()

export function registerSearchCatalogTool(server: McpServer, ctx: McpToolContext) {
  server.registerTool(
    'search_catalog',
    {
      description: `Search the catalog (items, variants, materials, processes, categories, places, regions, orgs, components).

${QUERY_FILTER_DSL_DOCS}

"filters" (separate from the query DSL above) lets you facet-filter by exact field/value pairs,
but the set of filterable fields differs per entity type and isn't fixed - call this tool once
with just "query" (and optionally "types") to get results AND a "facets" array describing which
fields are filterable for this result set and their possible values, then call again with
"filters" populated using the exact "field"/"value" strings from that response. Never guess a
filter field/value that didn't come from a prior response's facets.`,
      inputSchema: {
        query: z
          .string()
          .describe(
            'Free-text search query, optionally containing token:value filter syntax (see tool description).',
          ),
        types: z
          .array(z.enum(SearchType))
          .optional()
          .describe('Restrict results to these entity types. Omit to search all types.'),
        limit: z.number().int().positive().optional().describe('Max results to return.'),
        offset: z.number().int().min(0).optional().describe('Offset for pagination.'),
        filters: z
          .array(z.object({ field: z.string(), values: z.array(z.string()).min(1) }))
          .optional()
          .describe(
            'Facet filters using field/value strings taken verbatim from a prior response\'s "facets" array.',
          ),
      },
      outputSchema: {
        items: z.array(z.record(z.string(), z.unknown())),
        totalCount: z.number(),
        facets: z.array(
          z.object({
            field: z.string(),
            counts: z.array(z.object({ value: z.string(), count: z.number() })),
          }),
        ),
      },
    },
    async ({ query, types, limit, offset, filters }) => {
      const cursor = await ctx.searchService.searchAll(
        query,
        types,
        undefined,
        limit,
        offset,
        filters,
      )
      const result = {
        items: [] as Record<string, unknown>[],
        totalCount: 0,
        facets: [] as { field: string; counts: { value: string; count: number }[] }[],
      }

      if (!cursor) {
        return structuredResult(result)
      }

      result.items = await Promise.all(
        cursor.items.map(async (item) => {
          const model = await ctx.transform.entityToModel(item._type, item)
          return JSON.parse(JSON.stringify(model)) as Record<string, unknown>
        }),
      )
      result.totalCount = cursor.count
      result.facets = (cursor.facets ?? []).map((f) => ({
        field: f.field,
        counts: f.counts.map((c) => ({ value: c.value, count: c.count })),
      }))

      return structuredResult(result)
    },
  )
}
