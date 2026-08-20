import { MikroORM } from '@mikro-orm/postgresql'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import { graphql } from '@test/gql'
import { GraphQLTestClient } from '@test/graphql.utils'
import { type Mock } from 'vitest'

import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { RegionSeeder } from '@src/db/seeds/RegionSeeder'
import { UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'
import { SEARCH_BACKEND } from '@src/search/search.backend'

describe('RegionResolver (integration)', () => {
  let app: INestApplication
  let gql: GraphQLTestClient
  let searchMock: Mock<any>

  beforeAll(async () => {
    searchMock = vi.fn().mockResolvedValue({ hits: [], found: 0 })

    const module: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule],
    })
      .overrideProvider(SEARCH_BACKEND)
      .useValue({
        search: searchMock,
        multiSearch: vi.fn(({ searches }: { searches: unknown[] }) => ({
          results: searches.map(() => ({ hits: [], found: 0 })),
        })),
        listCollections: vi.fn().mockResolvedValue([]),
      })
      .compile()

    app = module.createNestApplication()
    await app.init()

    gql = new GraphQLTestClient(app)

    const orm = module.get<MikroORM>(MikroORM)

    await clearDatabase(orm, 'public', ['users'])
    await orm.seeder.seed(BaseSeeder, UserSeeder, RegionSeeder)

    await gql.signIn('admin', 'password')
  })

  afterAll(async () => {
    await app.close()
  })

  test('should query regions with pagination', async () => {
    const res = await gql.send(
      graphql(`
        query RegionResolverListRegions($first: Int) {
          regions(first: $first) {
            nodes {
              id
              name
            }
            totalCount
            pageInfo {
              hasNextPage
              hasPreviousPage
            }
          }
        }
      `),
      { first: 10 },
    )
    expect(res.data?.regions).toBeTruthy()
    expect(Array.isArray(res.data?.regions.nodes)).toBe(true)
  })

  test('should filter regions by name query', async () => {
    const res = await gql.send(
      graphql(`
        query RegionResolverQueryRegions($query: String, $first: Int) {
          regions(query: $query, first: $first) {
            nodes {
              id
              name
            }
          }
        }
      `),
      { query: 'San Francisco', first: 10 },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.regions.nodes.length).toBeGreaterThan(0)
    expect(res.data?.regions.nodes.every((n) => n.name?.includes('San Francisco'))).toBe(true)
  })

  test('should search regions by point with pagination', async () => {
    const res = await gql.send(
      graphql(`
        query RegionResolverSearchRegionsByPoint($latlong: [Float!]!, $first: Int) {
          searchRegionsByPoint(latlong: $latlong, first: $first) {
            nodes {
              id
              name
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
        latlong: [37.7749, -122.4194],
        first: 10,
      },
    )
    expect(res.data?.searchRegionsByPoint).toBeTruthy()
    expect(Array.isArray(res.data?.searchRegionsByPoint.nodes)).toBe(true)
  })

  test('should return error for non-existent region', async () => {
    const res = await gql.send(
      graphql(`
        query RegionResolverGetNonExistentRegion($id: ID!) {
          region(id: $id) {
            id
          }
        }
      `),
      { id: 'non-existent-id' },
    )
    expect(res.errors).toBeTruthy()
    expect(res.errors?.[0].message).toContain('Region not found')
  })

  describe('hierarchy fields', () => {
    const hierarchyQuery = graphql(`
      query RegionHierarchyFields($id: ID!) {
        region(id: $id) {
          id
          county {
            id
          }
          province {
            id
          }
          country {
            id
          }
        }
      }
    `)

    test('SF county resolves province=California and country=USA', async () => {
      const res = await gql.send(hierarchyQuery, { id: 'wof_102087579' })
      expect(res.data?.region?.province?.id).toBe('wof_85688637')
      expect(res.data?.region?.country?.id).toBe('wof_85633793')
      expect(res.data?.region?.county).toBeNull()
    })

    test('California resolves country=USA, county and province are null', async () => {
      const res = await gql.send(hierarchyQuery, { id: 'wof_85688637' })
      expect(res.data?.region?.country?.id).toBe('wof_85633793')
      expect(res.data?.region?.county).toBeNull()
      expect(res.data?.region?.province).toBeNull()
    })

    test('USA has no ancestors and all hierarchy fields are null', async () => {
      const res = await gql.send(hierarchyQuery, { id: 'wof_85633793' })
      expect(res.data?.region?.county).toBeNull()
      expect(res.data?.region?.province).toBeNull()
      expect(res.data?.region?.country).toBeNull()
    })
  })

  describe('searchWithin', () => {
    beforeEach(() => {
      searchMock.mockReset()
      searchMock.mockResolvedValue({ hits: [], found: 0 })
    })

    test('returns backend hits hydrated from DB', async () => {
      searchMock.mockResolvedValueOnce({
        hits: [{ id: 'wof_102087579', sourceCollection: 'regions', score: 100 }],
        found: 1,
      })
      const res = await gql.send(
        graphql(`
          query RegionSearchWithin($id: ID!) {
            region(id: $id) {
              searchWithin(query: "francisco") {
                totalCount
                nodes {
                  id
                }
              }
            }
          }
        `),
        { id: 'wof_85688637' },
      )
      expect(res.data?.region?.searchWithin?.totalCount).toBe(1)
      expect(res.data?.region?.searchWithin?.nodes?.[0]?.id).toBe('wof_102087579')
      expect(searchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          collection: 'regions',
          query: 'francisco',
          options: expect.objectContaining({
            geo: expect.objectContaining({
              type: 'boundingBox',
            }),
          }),
        }),
      )
    })

    test('passes adminLevel filter to the search backend', async () => {
      searchMock.mockResolvedValueOnce({ hits: [], found: 0 })
      await gql.send(
        graphql(`
          query RegionSearchWithinAdminLevel($id: ID!) {
            region(id: $id) {
              searchWithin(query: "city", adminLevel: 6) {
                totalCount
              }
            }
          }
        `),
        { id: 'wof_85633793' },
      )
      expect(searchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'city',
          options: expect.objectContaining({
            filters: [{ type: 'field', field: 'adminLevel', operator: '=', value: 6 }],
          }),
        }),
      )
    })
  })

  describe('currentRegion', () => {
    afterEach(() => {
      gql.setHeader('x-location', undefined)
    })

    test('returns null when no X-Location header is set', async () => {
      const res = await gql.send(
        graphql(`
          query RegionResolverCurrentRegionNoHeader {
            currentRegion {
              region {
                id
              }
              regionHierarchy {
                id
              }
            }
          }
        `),
      )
      expect(res.data?.currentRegion).toBeNull()
    })

    test('resolves by WoF region ID', async () => {
      gql.setHeader('x-location', 'wof_102087579')
      const res = await gql.send(
        graphql(`
          query RegionResolverCurrentRegionByID {
            currentRegion {
              region {
                id
                placetype
              }
              regionHierarchy {
                id
                placetype
              }
            }
          }
        `),
      )
      expect(res.data?.currentRegion?.region?.id).toBe('wof_102087579')
      expect(res.data?.currentRegion?.region?.placetype).toBe('county')
      const hierarchy = res.data?.currentRegion?.regionHierarchy
      expect(hierarchy?.length).toBe(3)
      expect(hierarchy?.[0]?.id).toBe('wof_102087579')
      expect(hierarchy?.[1]?.id).toBe('wof_85688637')
      expect(hierarchy?.[2]?.id).toBe('wof_85633793')
    })

    test('resolves by lat/lng (San Francisco)', async () => {
      gql.setHeader('x-location', '37.7749,-122.4194')
      const res = await gql.send(
        graphql(`
          query RegionResolverCurrentRegionByLatLng {
            currentRegion {
              region {
                id
                placetype
              }
              regionHierarchy {
                id
                placetype
              }
            }
          }
        `),
      )
      const hierarchy = res.data?.currentRegion?.regionHierarchy
      expect(res.data?.currentRegion?.region?.id).toBe('wof_102087579')
      expect(hierarchy?.length).toBe(3)
      expect(hierarchy?.[0]?.id).toBe('wof_102087579')
      expect(hierarchy?.[1]?.id).toBe('wof_85688637')
      expect(hierarchy?.[2]?.id).toBe('wof_85633793')
    })
  })
})
