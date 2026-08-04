import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import Typesense, { Client as TypesenseClient } from 'typesense'

import { OtelLogger } from '@src/common/otel-logger.service'
import {
  SearchBackend,
  SearchBackendFacetResult,
  SearchBackendFilter,
  SearchBackendGeoFilter,
  SearchBackendHit,
  SearchBackendMultiSearchRequest,
  SearchBackendMultiSearchResult,
  SearchBackendSearchRequest,
  SearchBackendSearchResult,
  SearchBackendVectorQuery,
} from '@src/search/search.backend'

type TypesenseDocument = {
  id: string
  geo?: [number, number]
} & Record<string, unknown>

type TypesenseSearchHit = {
  document: TypesenseDocument
  text_match: number
}

type TypesenseFacetCount = { count: number; value: string; highlighted?: string }
type TypesenseFacetResult = {
  field_name: string
  counts: TypesenseFacetCount[]
  stats: { total_values?: number }
}

type TypesenseSearchResponse = {
  found: number
  hits?: TypesenseSearchHit[]
  facet_counts?: TypesenseFacetResult[]
}

type TypesenseCollectionField = {
  name: string
  type: string
  index?: boolean
  facet?: boolean
  reference?: string
}

type TypesenseCollection = {
  name: string
  fields: TypesenseCollectionField[]
}

type TypesenseAlias = {
  name: string
  collection_name: string
}

export function resolveTypesenseApiKey(rawValue?: string) {
  const apiKey = rawValue?.trim()

  if (!apiKey) {
    throw new Error('TYPESENSE_API_KEY is not configured')
  }

  return apiKey
}

@Injectable()
export class TypesenseSearchService implements SearchBackend, OnModuleInit {
  private static readonly VECTOR_K = 100
  client?: TypesenseClient

  private availableCollectionsPromise: Promise<TypesenseCollection[]> | null = null
  private collectionCacheExpiry = 0
  private readonly collectionSchemaByName = new Map<string, TypesenseCollection>()
  private readonly collectionSchemaPromiseByName = new Map<string, Promise<TypesenseCollection>>()
  private readonly logger = new OtelLogger(TypesenseSearchService.name)

  private static readonly CACHE_TTL = 60 * 60 * 1000
  private static readonly LOCALIZED_QUERY_FIELD_PRIORITY = ['name', 'desc_short', 'desc']
  private static readonly DIRECT_QUERY_FIELD_PRIORITY = ['name', 'placetype', 'code']

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    let apiKey: string

    try {
      apiKey = resolveTypesenseApiKey(this.configService.get<string>('typesense.apiKey'))
    } catch {
      this.logger.warn(
        `Typesense health check skipped for ${this.describeNode()}: TYPESENSE_API_KEY is not configured`,
      )
      return
    }

    this.client ??= new Typesense.Client({
      nodes: [this.resolveNode()],
      apiKey,
      connectionTimeoutSeconds: 10,
    })

    try {
      await this.requireClient().health.retrieve()
      this.logger.log(`Typesense reachable at ${this.describeNode()}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.logger.warn(`Typesense health check failed for ${this.describeNode()}: ${message}`)
    }
  }

  async listCollections(): Promise<string[]> {
    return (await this.getCollectionSchemas()).map((collection) => collection.name)
  }

  async supportsVectorSearch(collection: string): Promise<boolean> {
    const schema = await this.getCollectionSchema(collection)
    return schema.fields.some((f) => f.name === 'embedding')
  }

  async search(request: SearchBackendSearchRequest): Promise<SearchBackendSearchResult> {
    const multiResult = await this.multiSearch({
      searches: [request],
    })

    return multiResult.results[0]
  }

  async multiSearch(
    request: SearchBackendMultiSearchRequest,
  ): Promise<SearchBackendMultiSearchResult> {
    const schemaEntries = await Promise.all(
      [...new Set(request.searches.map((search) => search.collection))].map(
        async (collection): Promise<[string, TypesenseCollection]> => [
          collection,
          await this.getCollectionSchema(collection),
        ],
      ),
    )
    const schemaByCollection = new Map<string, TypesenseCollection>(schemaEntries)

    const refCollectionNames = new Set<string>()
    for (const schema of schemaByCollection.values()) {
      for (const field of schema.fields) {
        if (field.reference) {
          const refCol = field.reference.split('.')[0]
          if (!schemaByCollection.has(refCol)) {
            refCollectionNames.add(refCol)
          }
        }
      }
    }
    const refSchemaEntries = await Promise.all(
      [...refCollectionNames].map(
        async (collection): Promise<[string, TypesenseCollection]> => [
          collection,
          await this.getCollectionSchema(collection),
        ],
      ),
    )
    const allSchemas = new Map<string, TypesenseCollection>([
      ...schemaByCollection,
      ...refSchemaEntries,
    ])

    const result = await this.requireClient().multiSearch.perform(
      {
        searches: request.searches.map((search) =>
          this.buildSearchParams(
            search,
            schemaByCollection.get(search.collection)!,
            allSchemas,
            true,
          ),
        ),
      },
      {},
    )

    return {
      results: request.searches.map((search, index) =>
        this.normalizeSearchResponse(
          result.results[index] as TypesenseSearchResponse,
          search.collection,
        ),
      ),
    }
  }

  private resolveNode() {
    const url = new URL(
      this.configService.get<string>('typesense.host')?.trim() || 'http://localhost:8108',
    )
    return {
      host: url.hostname,
      port: Number(url.port || (url.protocol === 'https:' ? 443 : 80)),
      protocol: url.protocol.replace(':', '') as 'http' | 'https',
    }
  }

  private requireClient() {
    if (!this.client) {
      throw new Error('Typesense client is not initialized')
    }

    return this.client
  }

  private describeNode() {
    const node = this.resolveNode()
    return `${node.protocol}://${node.host}:${node.port}`
  }

  private async getCollectionSchemas() {
    const cachedPromise = this.availableCollectionsPromise
    if (cachedPromise && Date.now() < this.collectionCacheExpiry) {
      return await cachedPromise
    }

    this.collectionCacheExpiry = Date.now() + TypesenseSearchService.CACHE_TTL
    this.availableCollectionsPromise = Promise.all([
      this.requireClient().aliases().retrieve(),
      this.requireClient().collections().retrieve(),
    ])
      .then(([aliasResponse, collections]) => {
        const aliases = (aliasResponse as { aliases: TypesenseAlias[] }).aliases || []
        const collectionsByName = new Map(
          (collections as TypesenseCollection[]).map(
            (collection): [string, TypesenseCollection] => [collection.name, collection],
          ),
        )
        const aliasedCollectionNames = new Set(aliases.map((alias) => alias.collection_name))

        this.collectionSchemaByName.clear()

        for (const alias of aliases) {
          const collection = collectionsByName.get(alias.collection_name)
          if (collection) {
            this.collectionSchemaByName.set(alias.name, collection)
          }
        }

        for (const collection of collections as TypesenseCollection[]) {
          if (!aliasedCollectionNames.has(collection.name)) {
            this.collectionSchemaByName.set(collection.name, collection)
          }
        }

        return [...this.collectionSchemaByName.entries()].map(([name, schema]) => ({
          ...schema,
          name,
        }))
      })
      .catch((error: unknown) => {
        this.availableCollectionsPromise = null
        this.collectionCacheExpiry = 0
        throw error
      })

    return await this.availableCollectionsPromise
  }

  private async getCollectionSchema(collection: string) {
    const cachedSchema = this.collectionSchemaByName.get(collection)
    if (cachedSchema) {
      return cachedSchema
    }

    await this.getCollectionSchemas()

    const refreshedSchema = this.collectionSchemaByName.get(collection)
    if (refreshedSchema) {
      return refreshedSchema
    }

    const cachedPromise = this.collectionSchemaPromiseByName.get(collection)
    if (cachedPromise) {
      return await cachedPromise
    }

    const schemaPromise = this.requireClient()
      .collections<TypesenseDocument>(collection)
      .retrieve()
      .then((schema: TypesenseCollection) => {
        this.collectionSchemaByName.set(collection, schema)
        return schema
      })
      .finally(() => {
        this.collectionSchemaPromiseByName.delete(collection)
      })

    this.collectionSchemaPromiseByName.set(collection, schemaPromise)

    return await schemaPromise
  }

  private buildSearchParams(
    request: SearchBackendSearchRequest,
    schema: TypesenseCollection,
    allSchemas: Map<string, TypesenseCollection>,
    includeCollection = false,
  ) {
    const filterBy = this.buildFilterBy(request.options?.filters, request.options?.geo)
    const hasVectorField = schema.fields.some((f) => f.name === 'embedding')
    const vectorQuery = this.buildVectorQuery(request.options?.vector, hasVectorField)
    const facetFields = schema.fields.filter((f) => f.facet).map((f) => f.name)

    const joinFacetFields: string[] = []
    for (const field of schema.fields) {
      if (!field.reference) continue
      const refColName = field.reference.split('.')[0]
      const refSchema = allSchemas.get(refColName)
      if (refSchema?.fields.some((f) => f.name === 'tags' && f.facet)) {
        joinFacetFields.push(`$${refColName}(tags)`)
      }
    }

    const allFacetFields = [...facetFields, ...joinFacetFields]

    const facetClauses = (request.options?.facetFilters ?? [])
      .map(({ field, values }) => this.buildFacetFilterClause(field, values, schema, allSchemas))
      .filter((c): c is string => c !== undefined)

    const allFilterClauses = [filterBy, ...facetClauses].filter(Boolean)
    const combinedFilterBy = allFilterClauses.length ? allFilterClauses.join(' && ') : undefined

    return {
      ...(includeCollection ? { collection: request.collection } : {}),
      q: request.query || '*',
      query_by: this.buildQueryBy(schema, request.options?.lang || 'en'),
      include_fields: 'id,geo',
      highlight_fields: 'none',
      ...(request.options?.limit !== undefined ? { limit: request.options.limit } : {}),
      ...(request.options?.offset !== undefined ? { offset: request.options.offset } : {}),
      ...(combinedFilterBy ? { filter_by: combinedFilterBy } : {}),
      ...(vectorQuery ? { vector_query: vectorQuery } : {}),
      ...(allFacetFields.length
        ? { facet_by: allFacetFields.join(','), max_facet_values: 20 }
        : {}),
    }
  }

  private buildFacetFilterClause(
    field: string,
    values: string[],
    schema: TypesenseCollection,
    allSchemas: Map<string, TypesenseCollection>,
  ): string | undefined {
    const escape = (v: string) => `\`${v.replaceAll('`', '\\`')}\``
    const valueList = values.map(escape).join(',')
    const clauses: string[] = []

    if (schema.fields.some((f) => f.name === field)) {
      clauses.push(`${field}:=[${valueList}]`)
    }

    const seenRefCols = new Set<string>()
    for (const f of schema.fields) {
      if (!f.reference) continue
      const refColName = f.reference.split('.')[0]
      if (seenRefCols.has(refColName)) continue
      seenRefCols.add(refColName)
      const refSchema = allSchemas.get(refColName)
      if (refSchema?.fields.some((rf) => rf.name === field)) {
        clauses.push(`$${refColName}(${field}:=[${valueList}])`)
      }
    }

    return clauses.length ? clauses.join(' || ') : undefined
  }

  private buildVectorQuery(vector: SearchBackendVectorQuery | undefined, hasVectorField: boolean) {
    if (!vector || !hasVectorField) {
      return undefined
    }

    if (vector.kind === 'embedding') {
      return `embedding:([${vector.values.join(',')}], k:${TypesenseSearchService.VECTOR_K})`
    }

    if (vector.kind === 'document') {
      return `embedding:([], id:${vector.id}, k:${TypesenseSearchService.VECTOR_K})`
    }

    throw new Error('Query vectors must be materialized before reaching TypesenseSearchService')
  }

  private buildQueryBy(schema: TypesenseCollection, lang: string) {
    const langs = [...new Set([lang, 'en'])]

    const availableFields = new Set(
      schema.fields
        .filter((field) => field.index !== false && ['string', 'string[]'].includes(field.type))
        .map((field) => field.name),
    )

    const localizedFields = langs.flatMap((locale) =>
      TypesenseSearchService.LOCALIZED_QUERY_FIELD_PRIORITY.map(
        (field) => `${field}_${locale}`,
      ).filter((field) => availableFields.has(field)),
    )

    const directFields = TypesenseSearchService.DIRECT_QUERY_FIELD_PRIORITY.filter((field) =>
      availableFields.has(field),
    )

    const queryFields = [...localizedFields, ...directFields]

    if (queryFields.length === 0) {
      throw new Error(
        `No searchable query_by fields found for Typesense collection "${schema.name}"`,
      )
    }

    return queryFields.join(',')
  }

  private buildFilterBy(filters?: SearchBackendFilter[], geo?: SearchBackendGeoFilter) {
    const clauses: string[] = []

    if (geo) {
      clauses.push(this.buildGeoFilter(geo))
    }

    if (filters?.length) {
      clauses.push(...filters.map((filter) => this.buildFilterClause(filter)))
    }

    return clauses.length > 0 ? clauses.join(' && ') : undefined
  }

  private buildGeoFilter(geo: SearchBackendGeoFilter) {
    if (geo.type === 'radius') {
      const distanceKm = Number((geo.distanceMeters / 1000).toFixed(3))
      return `geo:(${geo.latitude}, ${geo.longitude}, ${distanceKm} km)`
    }

    const { topLeft, bottomRight } = geo
    const topRight = { latitude: topLeft.latitude, longitude: bottomRight.longitude }
    const bottomLeft = { latitude: bottomRight.latitude, longitude: topLeft.longitude }

    return `geo:(${topLeft.latitude}, ${topLeft.longitude}, ${topRight.latitude}, ${topRight.longitude}, ${bottomRight.latitude}, ${bottomRight.longitude}, ${bottomLeft.latitude}, ${bottomLeft.longitude})`
  }

  private buildFilterClause(filter: SearchBackendFilter) {
    if (filter.type === 'raw') {
      return filter.expression
    }

    const value =
      typeof filter.value === 'string' ? `\`${filter.value.replaceAll('`', '\\`')}\`` : filter.value

    return `${filter.field}:=${value}`
  }

  private normalizeJoinFacetFieldName(name: string): string {
    const match = /^\$[^(]+\((.+)\)$/.exec(name)
    return match ? match[1] : name
  }

  private normalizeSearchResponse(
    result: TypesenseSearchResponse,
    sourceCollection: string,
  ): SearchBackendSearchResult {
    const facets: SearchBackendFacetResult[] = (result.facet_counts ?? []).map((fc) => ({
      field: this.normalizeJoinFacetFieldName(fc.field_name),
      counts: fc.counts.map((c) => ({
        value: c.value,
        count: c.count,
      })),
      totalValues: fc.stats?.total_values,
    }))

    return {
      hits: (result.hits || []).map((hit) => this.normalizeHit(hit, sourceCollection)),
      found: result.found || 0,
      ...(facets.length ? { facets } : {}),
    }
  }

  private normalizeHit(hit: TypesenseSearchHit, sourceCollection: string): SearchBackendHit {
    const geo = hit.document.geo

    return {
      id: String(hit.document.id),
      sourceCollection,
      score: hit.text_match || 0,
      ...(Array.isArray(geo) && geo.length === 2
        ? {
            geo: {
              latitude: geo[0],
              longitude: geo[1],
            },
          }
        : {}),
    }
  }
}
