import { ConfigService } from '@nestjs/config'
import { describe, expect, test, vi } from 'vitest'

import { resolveTypesenseApiKey, TypesenseSearchService } from '@src/search/typesense.service'

function makeTypesenseSearchService() {
  const aliases = [
    { name: 'items', collection_name: 'items__v1' },
    { name: 'variants', collection_name: 'variants__v1' },
    { name: 'places', collection_name: 'places__v1' },
    { name: 'orgs', collection_name: 'orgs__v1' },
  ]
  const schemasByCollection = new Map([
    ['items__v1', { name: 'items__v1', fields: [{ name: 'name_en', type: 'string' }] }],
    [
      'variants__v1',
      {
        name: 'variants__v1',
        fields: [
          { name: 'code', type: 'string[]' },
          { name: 'name_en', type: 'string' },
          { name: 'desc_en', type: 'string' },
        ],
      },
    ],
    [
      'places__v1',
      {
        name: 'places__v1',
        fields: [
          { name: 'name_sv', type: 'string' },
          { name: 'desc_sv', type: 'string' },
          { name: 'name_en', type: 'string' },
          { name: 'desc_en', type: 'string' },
        ],
      },
    ],
    [
      'orgs__v1',
      {
        name: 'orgs__v1',
        fields: [
          { name: 'name', type: 'string' },
          { name: 'desc_en', type: 'string' },
        ],
      },
    ],
  ])

  const service = new TypesenseSearchService(
    new ConfigService({
      typesense: {
        apiKey: 'test-typesense-key',
        host: 'http://localhost:8108',
      },
    }),
  )

  const mockSearch = vi.fn().mockResolvedValue({ found: 0, hits: [] })
  const mockAliasesRetrieve = vi.fn().mockResolvedValue({ aliases })
  const mockCollectionRetrieve = vi.fn((collection: string) =>
    Promise.resolve(schemasByCollection.get(collection)),
  )
  const mockCollectionsRetrieve = vi.fn().mockResolvedValue([...schemasByCollection.values()])
  const mockMultiSearch = vi.fn().mockResolvedValue({
    results: [
      {
        found: 1,
        hits: [{ document: { id: 'doc-1', geo: [48.86, 2.33] }, text_match: 99 }],
      },
    ],
  })

  service.client = {
    aliases: () => ({
      retrieve: mockAliasesRetrieve,
    }),
    collections: vi.fn((collection?: string) =>
      collection
        ? {
            retrieve: () => mockCollectionRetrieve(collection),
            documents: () => ({
              search: mockSearch,
            }),
          }
        : {
            retrieve: mockCollectionsRetrieve,
          },
    ),
    multiSearch: {
      perform: mockMultiSearch,
    },
  } as any

  return {
    service,
    mockAliasesRetrieve,
    mockSearch,
    mockCollectionRetrieve,
    mockCollectionsRetrieve,
    mockMultiSearch,
  }
}

describe('TypesenseSearchService', () => {
  test('trims api keys and rejects missing values', () => {
    expect(resolveTypesenseApiKey(' abc123 ')).toBe('abc123')
    expect(() => resolveTypesenseApiKey('')).toThrow('TYPESENSE_API_KEY is not configured')
  })

  test('lists collections and caches the result', async () => {
    const { service, mockAliasesRetrieve, mockCollectionsRetrieve } = makeTypesenseSearchService()

    const first = await service.listCollections()
    const second = await service.listCollections()

    expect(first).toEqual(['items', 'variants', 'places', 'orgs'])
    expect(second).toEqual(['items', 'variants', 'places', 'orgs'])
    expect(mockAliasesRetrieve).toHaveBeenCalledTimes(1)
    expect(mockCollectionsRetrieve).toHaveBeenCalledTimes(1)
  })

  test('logs when Typesense is reachable during module init', async () => {
    const { service } = makeTypesenseSearchService()
    const healthRetrieve = vi.fn().mockResolvedValue({ ok: true })
    const logSpy = vi.spyOn((service as any).logger, 'log').mockImplementation(() => undefined)

    service.client = {
      health: {
        retrieve: healthRetrieve,
      },
    } as any

    await service.onModuleInit()

    expect(healthRetrieve).toHaveBeenCalledTimes(1)
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Typesense reachable'))
  })

  test('builds Typesense search params with geo and field filters', async () => {
    const { service, mockMultiSearch } = makeTypesenseSearchService()

    await service.search({
      collection: 'places',
      query: '',
      options: {
        limit: 10,
        offset: 2,
        lang: 'sv',
        geo: {
          type: 'radius',
          latitude: 48.86,
          longitude: 2.33,
          distanceMeters: 5000,
        },
        filters: [
          {
            type: 'field',
            field: 'adminLevel',
            operator: '=',
            value: 4,
          },
          {
            type: 'raw',
            expression: 'code:07731343',
          },
        ],
      },
    })

    expect(mockMultiSearch).toHaveBeenCalledWith(
      {
        searches: [
          {
            collection: 'places',
            q: '*',
            query_by: 'name_sv,desc_sv,name_en,desc_en',
            include_fields: 'id,geo',
            highlight_fields: 'none',
            limit: 10,
            offset: 2,
            filter_by: 'geo:(48.86, 2.33, 5 km) && adminLevel:=4 && code:07731343',
          },
        ],
      },
      {},
    )
  })

  test('derives query_by from cached collection schema fields', async () => {
    const { service, mockCollectionRetrieve, mockMultiSearch } = makeTypesenseSearchService()

    await service.search({
      collection: 'variants',
      query: '07731343',
      options: {
        lang: 'fr',
      },
    })

    expect(mockMultiSearch).toHaveBeenCalledWith(
      {
        searches: [
          expect.objectContaining({
            collection: 'variants',
            q: '07731343',
            query_by: 'name_en,desc_en,code',
            include_fields: 'id,geo',
          }),
        ],
      },
      {},
    )
    expect(mockCollectionRetrieve).not.toHaveBeenCalled()
  })

  test('normalizes multi-search results with source collections and scores', async () => {
    const { service, mockMultiSearch } = makeTypesenseSearchService()
    mockMultiSearch.mockResolvedValueOnce({
      results: [
        {
          found: 1,
          hits: [{ document: { id: 'fr-1', geo: [48.86, 2.33] }, text_match: 100 }],
        },
        {
          found: 1,
          hits: [{ document: { id: 'en-1' }, text_match: 80 }],
        },
      ],
    })

    const result = await service.multiSearch({
      searches: [
        { collection: 'places', query: 'chaise', options: { lang: 'sv' } },
        { collection: 'items', query: 'chaise', options: { lang: 'en' } },
      ],
    })

    expect(result).toEqual({
      results: [
        {
          found: 1,
          hits: [
            {
              id: 'fr-1',
              sourceCollection: 'places',
              score: 100,
              geo: { latitude: 48.86, longitude: 2.33 },
            },
          ],
        },
        {
          found: 1,
          hits: [
            {
              id: 'en-1',
              sourceCollection: 'items',
              score: 80,
            },
          ],
        },
      ],
    })
  })

  test('supports vector search only when "embedding" field is present', async () => {
    const { service, mockCollectionsRetrieve } = makeTypesenseSearchService()
    mockCollectionsRetrieve.mockResolvedValue([
      { name: 'with-embedding', fields: [{ name: 'embedding', type: 'float[]' }] },
      { name: 'with-image-embedding', fields: [{ name: 'image_embedding', type: 'float[]' }] },
      { name: 'without-embedding', fields: [{ name: 'name', type: 'string' }] },
    ])

    expect(await service.supportsVectorSearch('with-embedding')).toBe(true)
    expect(await service.supportsVectorSearch('with-image-embedding')).toBe(false)
    expect(await service.supportsVectorSearch('without-embedding')).toBe(false)
  })

  test('includes vector_query in search params when vector is provided and supported', async () => {
    const { service, mockCollectionsRetrieve, mockMultiSearch } = makeTypesenseSearchService()
    mockCollectionsRetrieve.mockResolvedValue([
      {
        name: 'supported',
        fields: [
          { name: 'embedding', type: 'float[]' },
          { name: 'name', type: 'string' },
        ],
      },
    ])

    await service.search({
      collection: 'supported',
      query: 'test',
      options: {
        vector: {
          kind: 'embedding',
          values: [0.1, 0.2, 0.3],
        },
      },
    })

    expect(mockMultiSearch).toHaveBeenCalledWith(
      {
        searches: [
          expect.objectContaining({
            vector_query: 'embedding:([0.1,0.2,0.3], k:100)',
          }),
        ],
      },
      {},
    )
  })

  test('adds facet_by and max_facet_values when schema has facet fields', async () => {
    const { service, mockCollectionsRetrieve, mockMultiSearch } = makeTypesenseSearchService()
    mockCollectionsRetrieve.mockResolvedValue([
      {
        name: 'items',
        fields: [
          { name: 'name_en', type: 'string' },
          { name: 'tags', type: 'string[]', facet: true },
          { name: 'categories', type: 'string[]', facet: true },
        ],
      },
    ])

    await service.search({ collection: 'items', query: 'ceramic' })

    expect(mockMultiSearch).toHaveBeenCalledWith(
      {
        searches: [
          expect.objectContaining({
            facet_by: 'tags,categories',
            max_facet_values: 20,
          }),
        ],
      },
      {},
    )
  })

  test('omits facet_by when schema has no facet fields', async () => {
    const { service, mockMultiSearch } = makeTypesenseSearchService()

    await service.search({ collection: 'items', query: 'ceramic' })

    const call = mockMultiSearch.mock.calls[0][0] as any
    expect(call.searches[0]).not.toHaveProperty('facet_by')
    expect(call.searches[0]).not.toHaveProperty('max_facet_values')
  })

  test('normalizes facet_counts from Typesense response', async () => {
    const { service, mockCollectionsRetrieve, mockMultiSearch } = makeTypesenseSearchService()
    mockCollectionsRetrieve.mockResolvedValue([
      {
        name: 'items',
        fields: [
          { name: 'name_en', type: 'string' },
          { name: 'tags', type: 'string[]', facet: true },
        ],
      },
    ])
    mockMultiSearch.mockResolvedValueOnce({
      results: [
        {
          found: 2,
          hits: [],
          facet_counts: [
            {
              field_name: 'tags',
              counts: [
                { value: 'ceramic', count: 5, highlighted: '<mark>ceramic</mark>' },
                { value: 'glass', count: 2, highlighted: '<mark>glass</mark>' },
              ],
              stats: { total_values: 2 },
            },
          ],
        },
      ],
    })

    const result = await service.search({ collection: 'items', query: 'ceramic' })

    expect(result.facets).toEqual([
      {
        field: 'tags',
        counts: [
          { value: 'ceramic', count: 5 },
          { value: 'glass', count: 2 },
        ],
        totalValues: 2,
      },
    ])
    // highlighted is present in raw Typesense response but must not leak through
    expect(result.facets![0].counts[0]).not.toHaveProperty('highlighted')
  })

  test('omits facets from result when response has no facet_counts', async () => {
    const { service, mockMultiSearch } = makeTypesenseSearchService()
    mockMultiSearch.mockResolvedValueOnce({
      results: [{ found: 0, hits: [] }],
    })

    const result = await service.search({ collection: 'items', query: 'ceramic' })

    expect(result.facets).toBeUndefined()
  })

  test('appends joined tag facets for reference fields pointing to collections with tags facet', async () => {
    const { service, mockCollectionsRetrieve, mockMultiSearch } = makeTypesenseSearchService()
    mockCollectionsRetrieve.mockResolvedValue([
      {
        name: 'variants',
        fields: [
          { name: 'name_en', type: 'string' },
          { name: 'tags', type: 'string[]', facet: true },
          { name: 'components', type: 'string[]', facet: false, reference: 'components.id' },
        ],
      },
      {
        name: 'components',
        fields: [
          { name: 'name_en', type: 'string' },
          { name: 'tags', type: 'string[]', facet: true },
        ],
      },
    ])

    await service.search({ collection: 'variants', query: 'glass' })

    const call = mockMultiSearch.mock.calls[0][0] as any
    expect(call.searches[0].facet_by).toBe('tags,$components(tags)')
  })

  test('normalizes $Collection(field) facet field names to the inner field name', async () => {
    const { service, mockCollectionsRetrieve, mockMultiSearch } = makeTypesenseSearchService()
    mockCollectionsRetrieve.mockResolvedValue([
      {
        name: 'variants',
        fields: [
          { name: 'name_en', type: 'string' },
          { name: 'components', type: 'string[]', reference: 'components.id' },
        ],
      },
      {
        name: 'components',
        fields: [
          { name: 'name_en', type: 'string' },
          { name: 'tags', type: 'string[]', facet: true },
        ],
      },
    ])
    mockMultiSearch.mockResolvedValueOnce({
      results: [
        {
          found: 0,
          hits: [],
          facet_counts: [
            {
              field_name: '$components(tags)',
              counts: [{ value: 'recycled', count: 3 }],
              stats: { total_values: 1 },
            },
          ],
        },
      ],
    })

    const result = await service.search({ collection: 'variants', query: 'glass' })

    expect(result.facets).toEqual([
      {
        field: 'tags',
        counts: [{ value: 'recycled', count: 3 }],
        totalValues: 1,
      },
    ])
  })

  test('includes document-id vector_query when a source document is provided', async () => {
    const { service, mockCollectionsRetrieve, mockMultiSearch } = makeTypesenseSearchService()
    mockCollectionsRetrieve.mockResolvedValue([
      {
        name: 'supported',
        fields: [
          { name: 'embedding', type: 'float[]' },
          { name: 'name', type: 'string' },
        ],
      },
    ])

    await service.search({
      collection: 'supported',
      query: '',
      options: {
        vector: {
          kind: 'document',
          id: 'source-1',
        },
      },
    })

    expect(mockMultiSearch).toHaveBeenCalledWith(
      {
        searches: [
          expect.objectContaining({
            vector_query: 'embedding:([], id:source-1, k:100)',
          }),
        ],
      },
      {},
    )
  })

  test('facetFilters: direct field match emits field:=[values]', async () => {
    const { service, mockCollectionsRetrieve, mockMultiSearch } = makeTypesenseSearchService()
    mockCollectionsRetrieve.mockResolvedValue([
      {
        name: 'items',
        fields: [
          { name: 'name_en', type: 'string' },
          { name: 'tags', type: 'string[]', facet: true },
        ],
      },
    ])

    await service.search({
      collection: 'items',
      query: 'ceramic',
      options: {
        facetFilters: [{ field: 'tags', values: ['A', 'B'] }],
      },
    })

    const call = mockMultiSearch.mock.calls[0][0] as any
    expect(call.searches[0].filter_by).toBe('tags:=[`A`,`B`]')
  })

  test('facetFilters: join-only match emits $refCol(field:=[values])', async () => {
    const { service, mockCollectionsRetrieve, mockMultiSearch } = makeTypesenseSearchService()
    mockCollectionsRetrieve.mockResolvedValue([
      {
        name: 'variants',
        fields: [
          { name: 'name_en', type: 'string' },
          { name: 'components', type: 'string[]', reference: 'components.id' },
        ],
      },
      {
        name: 'components',
        fields: [
          { name: 'name_en', type: 'string' },
          { name: 'tags', type: 'string[]', facet: true },
        ],
      },
    ])

    await service.search({
      collection: 'variants',
      query: 'glass',
      options: {
        facetFilters: [{ field: 'tags', values: ['recycled'] }],
      },
    })

    const call = mockMultiSearch.mock.calls[0][0] as any
    expect(call.searches[0].filter_by).toBe('$components(tags:=[`recycled`])')
  })

  test('facetFilters: primary + join emits OR clause', async () => {
    const { service, mockCollectionsRetrieve, mockMultiSearch } = makeTypesenseSearchService()
    mockCollectionsRetrieve.mockResolvedValue([
      {
        name: 'variants',
        fields: [
          { name: 'name_en', type: 'string' },
          { name: 'tags', type: 'string[]', facet: true },
          { name: 'components', type: 'string[]', reference: 'components.id' },
        ],
      },
      {
        name: 'components',
        fields: [
          { name: 'name_en', type: 'string' },
          { name: 'tags', type: 'string[]', facet: true },
        ],
      },
    ])

    await service.search({
      collection: 'variants',
      query: 'glass',
      options: {
        facetFilters: [{ field: 'tags', values: ['A'] }],
      },
    })

    const call = mockMultiSearch.mock.calls[0][0] as any
    expect(call.searches[0].filter_by).toBe('tags:=[`A`] || $components(tags:=[`A`])')
  })

  test('facetFilters: multiple filters are ANDed together', async () => {
    const { service, mockCollectionsRetrieve, mockMultiSearch } = makeTypesenseSearchService()
    mockCollectionsRetrieve.mockResolvedValue([
      {
        name: 'items',
        fields: [
          { name: 'name_en', type: 'string' },
          { name: 'tags', type: 'string[]', facet: true },
          { name: 'categories', type: 'string[]', facet: true },
        ],
      },
    ])

    await service.search({
      collection: 'items',
      query: 'bottle',
      options: {
        facetFilters: [
          { field: 'tags', values: ['A'] },
          { field: 'categories', values: ['C'] },
        ],
      },
    })

    const call = mockMultiSearch.mock.calls[0][0] as any
    expect(call.searches[0].filter_by).toBe('tags:=[`A`] && categories:=[`C`]')
  })

  test('facetFilters: combined with existing filter_by via &&', async () => {
    const { service, mockCollectionsRetrieve, mockMultiSearch } = makeTypesenseSearchService()
    mockCollectionsRetrieve.mockResolvedValue([
      {
        name: 'items',
        fields: [
          { name: 'name_en', type: 'string' },
          { name: 'tags', type: 'string[]', facet: true },
        ],
      },
    ])

    await service.search({
      collection: 'items',
      query: 'bottle',
      options: {
        filters: [{ type: 'field', field: 'active', operator: '=', value: true }],
        facetFilters: [{ field: 'tags', values: ['eco'] }],
      },
    })

    const call = mockMultiSearch.mock.calls[0][0] as any
    expect(call.searches[0].filter_by).toBe('active:=true && tags:=[`eco`]')
  })

  test('facetFilters: unknown field on primary with no matching refs returns no filter', async () => {
    const { service, mockCollectionsRetrieve, mockMultiSearch } = makeTypesenseSearchService()
    mockCollectionsRetrieve.mockResolvedValue([
      {
        name: 'items',
        fields: [{ name: 'name_en', type: 'string' }],
      },
    ])

    await service.search({
      collection: 'items',
      query: 'bottle',
      options: {
        facetFilters: [{ field: 'nonexistent', values: ['x'] }],
      },
    })

    const call = mockMultiSearch.mock.calls[0][0] as any
    expect(call.searches[0]).not.toHaveProperty('filter_by')
  })
})
