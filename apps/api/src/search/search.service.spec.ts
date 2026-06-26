import { describe, expect, test, vi } from 'vitest'

import { I18nService } from '@src/common/i18n.service'
import { MetaService } from '@src/common/meta.service'
import { Tag } from '@src/process/tag.entity'
import { Category } from '@src/product/category.entity'
import { Item } from '@src/product/item.entity'
import { SearchIndex } from '@src/search/search.backend'
import { SearchType } from '@src/search/search.model'
import { SearchService } from '@src/search/search.service'

function makeSearchService() {
  const findManyByID = vi.fn(async (ids: string[]) => ids.map((id) => ({ id })))
  const searchBackend = {
    search: vi.fn(async () => ({ hits: [], found: 0 })),
    multiSearch: vi.fn(async () => ({ results: [] })),
    listCollections: vi.fn(async () => []),
    supportsVectorSearch: vi.fn(async () => true),
  }
  const i18n = {
    getLang: vi.fn(() => 'en'),
    tr: vi.fn(() => undefined),
  } as unknown as I18nService
  const metaService = {
    findEntityService: vi.fn((entityClass: unknown) => {
      if (entityClass === Item) {
        return [Item, { findManyByID }]
      }
      return null
    }),
  } as unknown as MetaService

  return {
    service: new SearchService(searchBackend as any, i18n, metaService),
    searchBackend,
    findManyByID,
    i18n,
  }
}

describe('SearchService', () => {
  test('searchRelated uses document vector queries and self exclusion', async () => {
    const { service, searchBackend, findManyByID } = makeSearchService()
    searchBackend.search.mockResolvedValue({
      hits: [{ id: 'item-2', sourceCollection: 'items', score: 99 }],
      found: 4,
    })

    const result = await service.searchRelated(SearchIndex.ITEMS, 'item-1', 'reusable', 5, 10)

    expect(searchBackend.search).toHaveBeenCalledWith({
      collection: 'items',
      query: 'reusable',
      options: {
        lang: 'en',
        filters: [{ type: 'raw', expression: 'id:!=`item-1`' }],
        limit: 6,
        offset: 10,
        vector: {
          kind: 'document',
          id: 'item-1',
        },
      },
    })
    expect(findManyByID).toHaveBeenCalledWith(['item-2'])
    expect(result.count).toBe(4)
    expect(result.items[0]).toMatchObject({ id: 'item-2', _type: 'Item' })
  })

  test('searchAll returns merged facets from all indexes', async () => {
    const { service, searchBackend } = makeSearchService()
    searchBackend.multiSearch.mockResolvedValue({
      results: [
        {
          hits: [],
          found: 0,
          facets: [
            {
              field: 'tags',
              counts: [
                { value: 'glass', count: 3 },
                { value: 'ceramic', count: 1 },
              ],
            },
          ],
        },
        {
          hits: [],
          found: 0,
          facets: [
            {
              field: 'tags',
              counts: [
                { value: 'ceramic', count: 4 },
                { value: 'metal', count: 2 },
              ],
            },
            { field: 'categories', counts: [{ value: 'bottles', count: 7 }] },
          ],
        },
      ],
    })

    const result = await service.searchAll('test', [SearchType.ITEM, SearchType.VARIANT])

    const tagFacet = result?.facets?.find((f) => f.field === 'tags')
    expect(tagFacet?.counts).toEqual([
      { value: 'ceramic', count: 4, label: 'ceramic', type: SearchType.VARIANT },
      { value: 'glass', count: 3, label: 'glass', type: SearchType.ITEM },
      { value: 'metal', count: 2, label: 'metal', type: SearchType.VARIANT },
      { value: 'ceramic', count: 1, label: 'ceramic', type: SearchType.ITEM },
    ])
    const categoryFacet = result?.facets?.find((f) => f.field === 'categories')
    expect(categoryFacet?.counts).toEqual([{ value: 'bottles', count: 7, label: 'bottles' }])
  })

  test('searchAll returns empty facets when backend returns none', async () => {
    const { service, searchBackend } = makeSearchService()
    searchBackend.multiSearch.mockResolvedValue({
      results: [{ hits: [], found: 0 }],
    })

    const result = await service.searchAll('test', [SearchType.ITEM])

    expect(result?.facets).toEqual([])
  })

  test('resolveFacetLabels populates labels for tag fields via entity service', async () => {
    const tagFindManyByID = vi.fn(async (ids: string[]) =>
      ids.map((id) => ({ id, name: { en: `Label for ${id}` } })),
    )
    const searchBackend = {
      search: vi.fn(async () => ({ hits: [], found: 0 })),
      multiSearch: vi.fn(async () => ({
        results: [
          {
            hits: [],
            found: 0,
            facets: [
              {
                field: 'tags',
                counts: [
                  { value: 'tag-1', count: 5 },
                  { value: 'tag-2', count: 3 },
                ],
              },
            ],
          },
        ],
      })),
      listCollections: vi.fn(async () => []),
      supportsVectorSearch: vi.fn(async () => false),
    }
    const i18n = {
      getLang: vi.fn(() => 'en'),
      tr: vi.fn((name: any) => (name?.en as string) ?? undefined),
    } as unknown as I18nService
    const metaService = {
      findEntityService: vi.fn((entityClass: unknown) => {
        if (entityClass === Tag) {
          return ['TagService', { findManyByID: tagFindManyByID }]
        }
        return null
      }),
    } as unknown as MetaService

    const service = new SearchService(searchBackend as any, i18n, metaService)
    const result = await service.searchAll('test', [SearchType.ITEM])

    const tagFacet = result?.facets?.find((f) => f.field === 'tags')
    expect(tagFacet?.counts[0].label).toBe('Label for tag-1')
    expect(tagFacet?.counts[1].label).toBe('Label for tag-2')
    expect(tagFindManyByID).toHaveBeenCalledWith(['tag-1', 'tag-2'])
  })

  test('searchAll: label defaults to value when no entity service is registered for the facet field', async () => {
    const { service, searchBackend } = makeSearchService()
    searchBackend.multiSearch.mockResolvedValue({
      results: [
        {
          hits: [],
          found: 0,
          facets: [{ field: 'tags', counts: [{ value: 'tag-xyz', count: 3 }] }],
        },
      ],
    })

    // makeSearchService() metaService only handles Item, not Tag — so label stays as value
    const result = await service.searchAll('test', [SearchType.ITEM])
    const tagFacet = result?.facets?.find((f) => f.field === 'tags')
    expect(tagFacet?.counts[0]).toMatchObject({ value: 'tag-xyz', label: 'tag-xyz' })
  })

  test('searchAll: label stays as value when entity lookup returns no match for the id', async () => {
    const tagFindManyByID = vi.fn(async () => [])
    const searchBackend = {
      search: vi.fn(async () => ({ hits: [], found: 0 })),
      multiSearch: vi.fn(async () => ({
        results: [
          {
            hits: [],
            found: 0,
            facets: [{ field: 'tags', counts: [{ value: 'tag-gone', count: 1 }] }],
          },
        ],
      })),
      listCollections: vi.fn(async () => []),
      supportsVectorSearch: vi.fn(async () => false),
    }
    const i18n = {
      getLang: vi.fn(() => 'en'),
      tr: vi.fn(() => undefined),
    } as unknown as I18nService
    const metaService = {
      findEntityService: vi.fn(() => ['TagService', { findManyByID: tagFindManyByID }]),
    } as unknown as MetaService

    const svc = new SearchService(searchBackend as any, i18n, metaService)
    const result = await svc.searchAll('test', [SearchType.ITEM])
    const tagFacet = result?.facets?.find((f) => f.field === 'tags')
    expect(tagFacet?.counts[0]).toMatchObject({ value: 'tag-gone', label: 'tag-gone' })
    expect(tagFindManyByID).toHaveBeenCalledWith(['tag-gone'])
  })

  test('searchAll: label resolved for categories facet', async () => {
    const catFindManyByID = vi.fn(async (ids: string[]) =>
      ids.map((id) => ({ id, name: { en: `Cat ${id}` } })),
    )
    const searchBackend = {
      search: vi.fn(async () => ({ hits: [], found: 0 })),
      multiSearch: vi.fn(async () => ({
        results: [
          {
            hits: [],
            found: 0,
            facets: [{ field: 'categories', counts: [{ value: 'cat-1', count: 7 }] }],
          },
        ],
      })),
      listCollections: vi.fn(async () => []),
      supportsVectorSearch: vi.fn(async () => false),
    }
    const i18n = {
      getLang: vi.fn(() => 'en'),
      tr: vi.fn((name: any) => (name?.en as string) ?? undefined),
    } as unknown as I18nService
    const metaService = {
      findEntityService: vi.fn((entityClass: unknown) => {
        if (entityClass === Category) return ['CategoryService', { findManyByID: catFindManyByID }]
        return null
      }),
    } as unknown as MetaService

    const svc = new SearchService(searchBackend as any, i18n, metaService)
    const result = await svc.searchAll('test', [SearchType.CATEGORY])
    const catFacet = result?.facets?.find((f) => f.field === 'categories')
    expect(catFacet?.counts[0]).toMatchObject({ value: 'cat-1', label: 'Cat cat-1' })
    expect(catFindManyByID).toHaveBeenCalledWith(['cat-1'])
  })

  test('searchAll passes a logical query vector to the backend for cacheable semantic search', async () => {
    const { service, searchBackend } = makeSearchService()
    searchBackend.multiSearch.mockResolvedValue({
      results: [{ hits: [], found: 0 }],
    })

    await service.searchAll('smart phone', [SearchType.ITEM], undefined, 10, 2)

    expect(searchBackend.multiSearch).toHaveBeenCalledWith({
      searches: [
        {
          collection: 'items',
          query: 'smart phone',
          options: {
            lang: 'en',
            vector: {
              kind: 'query',
              text: 'smart phone',
            },
            limit: 13,
          },
        },
      ],
    })
  })
})
