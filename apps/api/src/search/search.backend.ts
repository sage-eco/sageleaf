import { createHash } from 'node:crypto'

export enum SearchIndex {
  CATEGORIES = 'categories',
  ITEMS = 'items',
  VARIANTS = 'variants',
  COMPONENTS = 'components',
  MATERIALS = 'materials',
  PLACES = 'places',
  ORGS = 'orgs',
  REGIONS = 'regions',
}

export type SearchBackendFilter =
  | {
      type: 'field'
      field: string
      operator: '='
      value: string | number | boolean
    }
  | {
      type: 'raw'
      expression: string
    }

export type SearchBackendGeoFilter =
  | {
      type: 'radius'
      latitude: number
      longitude: number
      distanceMeters: number
    }
  | {
      type: 'boundingBox'
      topLeft: {
        latitude: number
        longitude: number
      }
      bottomRight: {
        latitude: number
        longitude: number
      }
    }

export type SearchBackendVectorQuery =
  | {
      kind: 'embedding'
      values: number[]
    }
  | {
      kind: 'document'
      id: string
    }
  | {
      kind: 'query'
      text: string
    }

export interface SearchBackendSearchOptions {
  limit?: number
  offset?: number
  filters?: SearchBackendFilter[]
  facetFilters?: { field: string; values: string[] }[]
  geo?: SearchBackendGeoFilter
  lang?: string
  vector?: SearchBackendVectorQuery
}

export interface SearchBackendSearchRequest {
  collection: string
  query: string
  options?: SearchBackendSearchOptions
}

export interface SearchBackendHit {
  id: string
  sourceCollection: string
  score: number
  geo?: {
    latitude: number
    longitude: number
  }
}

export interface SearchBackendFacetCount {
  value: string
  count: number
  label?: string
  type?: string
}

export interface SearchBackendFacetResult {
  field: string
  counts: SearchBackendFacetCount[]
  totalValues?: number
}

export interface SearchBackendSearchResult {
  hits: SearchBackendHit[]
  found: number
  facets?: SearchBackendFacetResult[]
}

export interface SearchBackendMultiSearchRequest {
  searches: SearchBackendSearchRequest[]
}

export interface SearchBackendMultiSearchResult {
  results: SearchBackendSearchResult[]
}

export interface SearchBackend {
  listCollections(): Promise<string[]>
  search(request: SearchBackendSearchRequest): Promise<SearchBackendSearchResult>
  multiSearch(request: SearchBackendMultiSearchRequest): Promise<SearchBackendMultiSearchResult>
  supportsVectorSearch(collection: string): Promise<boolean>
}

export const SEARCH_BACKEND = Symbol('SEARCH_BACKEND')

function normalizeSearchBackendValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeSearchBackendValue(entry))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, normalizeSearchBackendValue(entry)]),
    )
  }

  return value
}

export function buildSearchBackendCacheKey(
  prefix: string,
  request: SearchBackendSearchRequest | SearchBackendMultiSearchRequest,
) {
  const normalized = normalizeSearchBackendValue(request)
  const hash = createHash('sha256')
    .update(JSON.stringify(normalized))
    .digest()
    .subarray(0, 12)
    .toString('base64url')
  return `${prefix}:${hash}`
}
