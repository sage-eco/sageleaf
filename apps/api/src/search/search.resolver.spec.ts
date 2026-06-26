import { MikroORM } from '@mikro-orm/postgresql'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import { graphql } from '@test/gql'
import { SearchType } from '@test/gql/graphql'
import { GraphQLTestClient } from '@test/graphql.utils'

import { I18nService } from '@src/common/i18n.service'
import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { CATEGORY_IDS, TestCategorySeeder } from '@src/db/seeds/TestCategorySeeder'
import { TestMaterialSeeder } from '@src/db/seeds/TestMaterialSeeder'
import { TestVariantSeeder, VARIANT_IDS } from '@src/db/seeds/TestVariantSeeder'
import { UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'
import { MistralService } from '@src/search/mistral.service'
import { SEARCH_BACKEND } from '@src/search/search.backend'

describe('SearchResolver (integration)', () => {
  let app: INestApplication
  let gql: GraphQLTestClient
  let searchMock: ReturnType<typeof vi.fn<(search: any) => any>>
  let multiSearchMock: ReturnType<typeof vi.fn<(input: any) => any>>
  let mistralMock: ReturnType<typeof vi.fn<() => Promise<number[]>>>
  let i18nService: I18nService

  const emptySearchResult = {
    hits: [],
    found: 0,
  }

  beforeAll(async () => {
    searchMock = vi.fn<(search: any) => any>()
    multiSearchMock = vi.fn<(input: any) => any>()
    mistralMock = vi.fn<() => Promise<number[]>>().mockResolvedValue([0.1, 0.2, 0.3])

    const module: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule],
    })
      .overrideProvider(SEARCH_BACKEND)
      .useValue({
        search: searchMock,
        multiSearch: multiSearchMock,
        listCollections: vi.fn().mockResolvedValue([]),
        supportsVectorSearch: vi.fn().mockResolvedValue(true),
      })
      .overrideProvider(MistralService)
      .useValue({
        getEmbedding: mistralMock,
      })
      .compile()

    app = module.createNestApplication()
    await app.init()

    gql = new GraphQLTestClient(app)
    i18nService = module.get(I18nService)

    const orm = module.get<MikroORM>(MikroORM)

    await clearDatabase(orm, 'public', ['users'])
    await orm.seeder.seed(
      BaseSeeder,
      UserSeeder,
      TestMaterialSeeder,
      TestVariantSeeder,
      TestCategorySeeder,
    )

    await gql.signIn('admin', 'password')
  })

  beforeEach(() => {
    searchMock.mockReset()
    searchMock.mockImplementation(() => emptySearchResult)

    multiSearchMock.mockReset()
    multiSearchMock.mockImplementation(({ searches }: any) => ({
      results: searches.map((search: any) => searchMock(search)),
    }))
  })

  afterAll(async () => {
    await app.close()
  })

  test('should hydrate variant from database via cross-type search', async () => {
    const variantId = VARIANT_IDS[0]
    searchMock.mockImplementation(({ collection }: any) =>
      collection === 'variants'
        ? {
            hits: [{ id: variantId, sourceCollection: 'variants', score: 42 }],
            found: 1,
          }
        : emptySearchResult,
    )

    const res = await gql.send(
      graphql(`
        query SearchResolverSearchAll($query: String!, $limit: Int) {
          search(query: $query, limit: $limit) {
            nodes {
              __typename
              ... on Named {
                id
                name
              }
            }
            totalCount
            pageInfo {
              hasNextPage
              hasPreviousPage
            }
          }
        }
      `),
      {
        query: 'variant',
        limit: 10,
      },
    )

    expect(res.data?.search).toBeTruthy()
    expect(res.data?.search.totalCount).toBe(1)
    expect(res.data?.search.nodes?.[0]?.__typename).toBe('Variant')
    expect((res.data?.search.nodes?.[0] as any)?.id).toBe(variantId)
  })

  test('should hydrate categories from database via single-index search', async () => {
    searchMock.mockImplementation(({ collection }: any) =>
      collection === 'categories'
        ? {
            hits: [
              { id: CATEGORY_IDS[0], sourceCollection: 'categories', score: 30 },
              { id: CATEGORY_IDS[1], sourceCollection: 'categories', score: 20 },
              { id: CATEGORY_IDS[2], sourceCollection: 'categories', score: 10 },
            ],
            found: 3,
          }
        : emptySearchResult,
    )

    const res = await gql.send(
      graphql(`
        query SearchResolverCategoryResults($query: String!, $types: [SearchType!], $limit: Int) {
          search(query: $query, types: $types, limit: $limit) {
            nodes {
              __typename
              ... on Named {
                id
                name
              }
            }
            totalCount
          }
        }
      `),
      {
        query: 'packaging',
        types: [SearchType.Category],
        limit: 10,
      },
    )

    expect(res.data?.search).toBeTruthy()
    expect(res.data?.search.totalCount).toBe(3)
    const nodes = res.data?.search.nodes as any[]
    expect(nodes).toHaveLength(3)
    expect(nodes[0].__typename).toBe('Category')
    expect(nodes[0].name).toBe('Packaging')
    expect(nodes[1].name).toBe('Electronics')
    expect(nodes[2].name).toBe('Bottles')
  })

  test('should search with specific types', async () => {
    const res = await gql.send(
      graphql(`
        query SearchResolverSearchTypes($query: String!, $types: [SearchType!], $limit: Int) {
          search(query: $query, types: $types, limit: $limit) {
            nodes {
              __typename
              ... on Named {
                id
                name
              }
            }
            totalCount
          }
        }
      `),
      {
        query: 'test',
        types: [SearchType.Variant, SearchType.Item],
        limit: 10,
      },
    )

    expect(res.data?.search).toBeTruthy()
    expect(Array.isArray(res.data?.search.nodes)).toBe(true)
  })

  test('should search with location filter', async () => {
    const res = await gql.send(
      graphql(`
        query SearchResolverSearchWithLocation($query: String!, $latlong: [Float!], $limit: Int) {
          search(query: $query, latlong: $latlong, limit: $limit) {
            nodes {
              __typename
              ... on Named {
                id
                name
              }
            }
            totalCount
          }
        }
      `),
      {
        query: 'test',
        latlong: [37.7749, -122.4194],
        limit: 10,
      },
    )

    expect(res.data?.search).toBeTruthy()
    expect(Array.isArray(res.data?.search.nodes)).toBe(true)
  })

  test('should handle empty search results', async () => {
    const res = await gql.send(
      graphql(`
        query SearchResolverSearchEmpty($query: String!, $limit: Int) {
          search(query: $query, limit: $limit) {
            nodes {
              __typename
            }
            totalCount
          }
        }
      `),
      {
        query: 'nonexistent-search-term-xyz123',
        limit: 10,
      },
    )

    expect(res.data?.search).toBeTruthy()
    expect(res.data?.search.totalCount).toBe(0)
    expect(res.data?.search.nodes?.length).toBe(0)
  })

  test('should keep using the base collection for non-English queries', async () => {
    vi.spyOn(i18nService, 'getLang').mockReturnValueOnce('de')

    await gql.send(
      graphql(`
        query SearchResolverLangFallbackSingle($query: String!, $types: [SearchType!]) {
          search(query: $query, types: $types) {
            nodes {
              __typename
            }
            totalCount
          }
        }
      `),
      { query: 'test', types: [SearchType.Category] },
    )

    expect(searchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'categories',
        options: expect.objectContaining({ lang: 'de' }),
      }),
    )
  })

  test('should pass the active language while querying base collections across types', async () => {
    vi.spyOn(i18nService, 'getLang').mockReturnValueOnce('de')

    await gql.send(
      graphql(`
        query SearchResolverLangFallbackFederated($query: String!, $types: [SearchType!]) {
          search(query: $query, types: $types) {
            nodes {
              __typename
            }
            totalCount
          }
        }
      `),
      { query: 'test', types: [SearchType.Category, SearchType.Item] },
    )

    expect(multiSearchMock).toHaveBeenCalled()
    expect(
      (multiSearchMock.mock.calls[0][0] as any).searches.map((request: any) => ({
        collection: request.collection,
        lang: request.options?.lang,
      })),
    ).toEqual([
      { collection: 'categories', lang: 'de' },
      { collection: 'items', lang: 'de' },
    ])
  })

  test('should parse configured query filters and only search matching collections when no text remains', async () => {
    searchMock.mockImplementation(({ collection, query, options }: any) =>
      collection === 'variants' && query === ''
        ? {
            hits: [
              {
                id: VARIANT_IDS[0],
                sourceCollection: 'variants',
                score: 50,
              },
            ],
            found: 1,
          }
        : emptySearchResult,
    )

    const res = await gql.send(
      graphql(`
        query SearchResolverQueryFilters($query: String!, $limit: Int) {
          search(query: $query, limit: $limit) {
            nodes {
              __typename
              ... on Named {
                id
              }
            }
            totalCount
          }
        }
      `),
      {
        query: 'code:07731343',
        limit: 10,
      },
    )

    expect(res.data?.search.totalCount).toBe(1)
    expect(searchMock.mock.calls.map(([request]: any) => request.collection)).toEqual(['variants'])
    expect(searchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        collection: 'variants',
        query: '',
        options: expect.objectContaining({
          filters: [
            {
              type: 'raw',
              expression: 'code:07731343',
            },
          ],
        }),
      }),
    )
  })

  test('should search with pagination', async () => {
    const res = await gql.send(
      graphql(`
        query SearchResolverSearchPagination($query: String!, $limit: Int, $offset: Int) {
          search(query: $query, limit: $limit, offset: $offset) {
            nodes {
              __typename
              ... on Named {
                id
                name
              }
            }
            totalCount
            pageInfo {
              hasNextPage
              hasPreviousPage
            }
          }
        }
      `),
      {
        query: 'test',
        limit: 5,
        offset: 0,
      },
    )

    expect(res.data?.search).toBeTruthy()
    expect(Array.isArray(res.data?.search.nodes)).toBe(true)
  })

  test('returns facets from search results', async () => {
    searchMock.mockImplementation(() => ({
      hits: [],
      found: 0,
      facets: [
        {
          field: 'tags',
          counts: [
            { value: 'ceramic', count: 5 },
            { value: 'glass', count: 2 },
          ],
        },
        { field: 'categories', counts: [{ value: 'bottles', count: 7 }] },
      ],
    }))

    const res = await gql.send(
      graphql(`
        query SearchResolverFacets($query: String!, $types: [SearchType!]) {
          search(query: $query, types: $types) {
            facets {
              field
              counts {
                value
                count
              }
            }
          }
        }
      `),
      { query: 'ceramic', types: [SearchType.Item] },
    )

    const facets = res.data?.search.facets as any[]
    expect(facets).toBeTruthy()
    const tagFacet = facets.find((f: any) => f.field === 'tags')
    expect(tagFacet?.counts).toEqual([
      { value: 'ceramic', count: 5 },
      { value: 'glass', count: 2 },
    ])
    const categoryFacet = facets.find((f: any) => f.field === 'categories')
    expect(categoryFacet?.counts).toEqual([{ value: 'bottles', count: 7 }])
  })

  test('facets(limit) caps returned values per facet', async () => {
    searchMock.mockImplementation(() => ({
      hits: [],
      found: 0,
      facets: [
        {
          field: 'tags',
          counts: Array.from({ length: 15 }, (_, i) => ({ value: `tag-${i}`, count: 15 - i })),
        },
      ],
    }))

    const res = await gql.send(
      graphql(`
        query SearchResolverFacetsLimit($query: String!) {
          search(query: $query) {
            facets(limit: 3) {
              field
              counts {
                value
                count
              }
            }
          }
        }
      `),
      { query: 'test' },
    )

    const facets = res.data?.search.facets as any[]
    expect(facets[0].counts).toHaveLength(3)
    expect(facets[0].counts[0].value).toBe('tag-0')
  })

  test('facets limit is capped at 20', async () => {
    searchMock.mockImplementation(() => ({
      hits: [],
      found: 0,
      facets: [
        {
          field: 'tags',
          counts: Array.from({ length: 20 }, (_, i) => ({ value: `tag-${i}`, count: 20 - i })),
        },
      ],
    }))

    const res = await gql.send(
      graphql(`
        query SearchResolverFacetsCapLimit($query: String!) {
          search(query: $query) {
            facets(limit: 99) {
              field
              counts {
                value
              }
            }
          }
        }
      `),
      { query: 'test' },
    )

    const facets = res.data?.search.facets as any[]
    expect(facets[0].counts).toHaveLength(20)
  })

  test('returns empty facets array when search returns no results', async () => {
    const res = await gql.send(
      graphql(`
        query SearchResolverFacetsEmpty($query: String!) {
          search(query: $query) {
            facets {
              field
            }
          }
        }
      `),
      { query: 'nonexistent-xyz' },
    )

    expect(res.data?.search.facets).toEqual([])
  })

  test('facets label falls back to value when entity is not found', async () => {
    searchMock.mockImplementation(() => ({
      hits: [],
      found: 0,
      facets: [{ field: 'tags', counts: [{ value: 'unknown-tag-id', count: 3 }] }],
    }))

    const res = await gql.send(
      graphql(`
        query SearchResolverFacetsLabelFallback($query: String!) {
          search(query: $query) {
            facets {
              field
              counts {
                value
                label
              }
            }
          }
        }
      `),
      { query: 'test' },
    )

    const facets = res.data?.search.facets as any[]
    const tagFacet = facets.find((f: any) => f.field === 'tags')
    expect(tagFacet?.counts[0]).toEqual({ value: 'unknown-tag-id', label: 'unknown-tag-id' })
  })

  test('facets label is resolved from the entity name for categories', async () => {
    searchMock.mockImplementation(() => ({
      hits: [],
      found: 0,
      facets: [{ field: 'categories', counts: [{ value: CATEGORY_IDS[0], count: 5 }] }],
    }))

    const res = await gql.send(
      graphql(`
        query SearchResolverFacetsLabelResolved($query: String!, $types: [SearchType!]) {
          search(query: $query, types: $types) {
            facets {
              field
              counts {
                value
                label
              }
            }
          }
        }
      `),
      { query: 'packaging', types: [SearchType.Category] },
    )

    const facets = res.data?.search.facets as any[]
    const catFacet = facets.find((f: any) => f.field === 'categories')
    expect(catFacet?.counts[0]).toMatchObject({ value: CATEGORY_IDS[0], label: 'Packaging' })
  })

  test('filters arg is passed through to the backend multiSearch options', async () => {
    await gql.send(
      graphql(`
        query SearchResolverFacetFilters(
          $query: String!
          $types: [SearchType!]
          $filters: [SearchFacetFilterInput!]
        ) {
          search(query: $query, types: $types, filters: $filters) {
            nodes {
              __typename
            }
            totalCount
          }
        }
      `),
      {
        query: 'ceramic',
        types: [SearchType.Item],
        filters: [{ field: 'tags', values: ['ceramic'] }],
      } as any,
    )

    expect(multiSearchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        searches: expect.arrayContaining([
          expect.objectContaining({
            options: expect.objectContaining({
              facetFilters: [{ field: 'tags', values: ['ceramic'] }],
            }),
          }),
        ]),
      }),
    )
  })
})
