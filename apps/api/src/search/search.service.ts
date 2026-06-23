import { Inject, Injectable } from '@nestjs/common'

import { InternalServerErr } from '@src/common/exceptions'
import { I18nService } from '@src/common/i18n.service'
import { MetaService } from '@src/common/meta.service'
import { Place } from '@src/geo/place.entity'
import { Region } from '@src/geo/region.entity'
import { DEFAULT_PAGE_SIZE } from '@src/graphql/paginated'
import { Component } from '@src/process/component.entity'
import { Material } from '@src/process/material.entity'
import { Category } from '@src/product/category.entity'
import { Item } from '@src/product/item.entity'
import { Variant } from '@src/product/variant.entity'
import { DEFAULT_RELATED_LIMIT, RelatedArgs, RelatedArgsSchema } from '@src/search/related.model'
import {
  SEARCH_BACKEND,
  SearchBackendFilter,
  SearchBackendGeoFilter,
  SearchBackendHit,
  SearchBackendVectorQuery,
  SearchIndex,
} from '@src/search/search.backend'
import type { SearchBackend } from '@src/search/search.backend'
import { SearchType } from '@src/search/search.model'
import { parseSearchQuery } from '@src/search/search.query-filters'
import { Org } from '@src/users/org.entity'

@Injectable()
export class SearchService {
  constructor(
    @Inject(SEARCH_BACKEND) private readonly searchBackend: SearchBackend,
    private readonly i18n: I18nService,
    private readonly metaService: MetaService,
  ) {}

  typeIndexMap: Record<SearchType, SearchIndex> = {
    [SearchType.CATEGORY]: SearchIndex.CATEGORIES,
    [SearchType.ITEM]: SearchIndex.ITEMS,
    [SearchType.VARIANT]: SearchIndex.VARIANTS,
    [SearchType.COMPONENT]: SearchIndex.COMPONENTS,
    [SearchType.ORG]: SearchIndex.ORGS,
    [SearchType.PLACE]: SearchIndex.PLACES,
    [SearchType.REGION]: SearchIndex.REGIONS,
    [SearchType.MATERIAL]: SearchIndex.MATERIALS,
  }

  indexEntityClassMap: Record<SearchIndex, any> = {
    [SearchIndex.CATEGORIES]: Category,
    [SearchIndex.ITEMS]: Item,
    [SearchIndex.VARIANTS]: Variant,
    [SearchIndex.COMPONENTS]: Component,
    [SearchIndex.ORGS]: Org,
    [SearchIndex.PLACES]: Place,
    [SearchIndex.REGIONS]: Region,
    [SearchIndex.MATERIALS]: Material,
  }

  mapTypeToIndex(type: SearchType): SearchIndex {
    return this.typeIndexMap[type]
  }

  mapIndexToEntityClass(indexUid: string): any {
    const base = indexUid.replace(/_[a-z]{2,3}$/, '') as SearchIndex
    return this.indexEntityClassMap[base]
  }

  private async hydrateHits(hits: SearchBackendHit[], defaultEntityClass?: any) {
    const classByHit = hits.map((h) => {
      const entityClass = defaultEntityClass ?? this.mapIndexToEntityClass(h.sourceCollection)
      return { hit: h, entityClass }
    })

    const idsByClass = new Map<any, string[]>()
    for (const { hit, entityClass } of classByHit) {
      if (!entityClass) continue
      if (!idsByClass.has(entityClass)) {
        idsByClass.set(entityClass, [])
      }
      idsByClass.get(entityClass)!.push(hit.id)
    }

    const entityByClassById = new Map<any, Map<string, any>>()
    for (const [entityClass, ids] of idsByClass.entries()) {
      const svcResult = this.metaService.findEntityService(entityClass)
      if (!svcResult) continue
      const [, service] = svcResult
      const entities = await service.findManyByID(ids)
      entityByClassById.set(entityClass, new Map(entities.map((e: any) => [e.id, e])))
    }

    const result = []
    for (const { hit, entityClass } of classByHit) {
      if (!entityClass) continue
      const entity = entityByClassById.get(entityClass)?.get(hit.id)
      if (!entity) continue
      entity._type = entityClass.name
      if (hit.geo) {
        entity.location = {
          latitude: hit.geo.latitude,
          longitude: hit.geo.longitude,
        }
      }
      result.push(entity)
    }
    return result
  }

  private buildGeoFilter(latLong?: number[]): SearchBackendGeoFilter | undefined {
    if (!latLong || latLong.length < 2) {
      return undefined
    }

    if (latLong.length === 2) {
      return {
        type: 'radius',
        latitude: latLong[0],
        longitude: latLong[1],
        distanceMeters: 10000,
      }
    }

    if (latLong.length === 3) {
      return {
        type: 'radius',
        latitude: latLong[0],
        longitude: latLong[1],
        distanceMeters: latLong[2],
      }
    }

    if (latLong.length === 4) {
      return {
        type: 'boundingBox',
        topLeft: {
          latitude: latLong[0],
          longitude: latLong[1],
        },
        bottomRight: {
          latitude: latLong[2],
          longitude: latLong[3],
        },
      }
    }

    return undefined
  }

  private buildSearchKey(hit: SearchBackendHit) {
    const entityClass = this.mapIndexToEntityClass(hit.sourceCollection)
    return `${entityClass?.name || hit.sourceCollection}:${hit.id}`
  }

  private rankHits(hits: SearchBackendHit[]) {
    return [...hits].sort((a, b) => b.score - a.score)
  }

  private buildExcludeIdFilter(id: string): SearchBackendFilter {
    return {
      type: 'raw',
      expression: `id:!=\`${id.replaceAll('`', '\\`')}\``,
    }
  }

  async parseRelatedArgs(args: RelatedArgs) {
    const result = await RelatedArgsSchema.safeParseAsync(args)
    if (!result.success) {
      throw result.error
    }

    return {
      query: result.data.query,
      limit: result.data.limit ?? DEFAULT_RELATED_LIMIT,
      offset: result.data.offset ?? 0,
    }
  }

  async searchWithin(
    index: SearchIndex,
    bbox: string | undefined,
    query: string,
    opts: { adminLevel?: number; limit?: number; offset?: number },
  ): Promise<{ items: any[]; count: number }> {
    if (!bbox) {
      return { items: [], count: 0 }
    }
    const [minLon, minLat, maxLon, maxLat] = bbox.split(',').map(Number)
    if ([minLon, minLat, maxLon, maxLat].some((n) => isNaN(n))) {
      throw InternalServerErr(`Invalid bbox format for searchWithin: "${bbox}"`)
    }
    const { textQuery, filtersByIndex } = parseSearchQuery(query, [index])
    const filters: SearchBackendFilter[] = [...(filtersByIndex.get(index) || [])]
    if (opts.adminLevel !== undefined) {
      filters.push({
        type: 'field',
        field: 'adminLevel',
        operator: '=',
        value: opts.adminLevel,
      })
    }
    const lang = this.i18n.getLang()
    const fetchLimit = (opts.limit ?? 10) + (opts.offset ?? 0)

    const words = textQuery.trim().split(/\s+/)
    let vector: SearchBackendVectorQuery | undefined
    if (
      words.length >= 2 &&
      words[0] !== '' &&
      (await this.searchBackend.supportsVectorSearch(index))
    ) {
      vector = {
        kind: 'query' as const,
        text: textQuery,
      }
    }

    const result = await this.searchBackend.search({
      collection: index,
      query: textQuery,
      options: {
        lang,
        filters,
        vector,
        geo: {
          type: 'boundingBox',
          topLeft: {
            latitude: maxLat,
            longitude: maxLon,
          },
          bottomRight: {
            latitude: minLat,
            longitude: minLon,
          },
        },
        limit: fetchLimit,
      },
    })
    const entityClass = this.mapIndexToEntityClass(index)
    const hits = result.hits.slice(opts.offset ?? 0, (opts.offset ?? 0) + (opts.limit ?? 10))
    const items = await this.hydrateHits(hits, entityClass)
    return { items, count: result.found }
  }

  async searchAll(
    query: string,
    types?: SearchType[],
    latLong?: number[],
    limit?: number,
    offset?: number,
  ) {
    const idxs =
      types?.map((t) => this.mapTypeToIndex(t)) ||
      ([
        SearchIndex.CATEGORIES,
        SearchIndex.ITEMS,
        SearchIndex.VARIANTS,
        SearchIndex.ORGS,
        SearchIndex.PLACES,
      ] as SearchIndex[])
    const { textQuery, filtersByIndex } = parseSearchQuery(query, idxs)
    const geo = this.buildGeoFilter(latLong)
    const searchableIndexes = idxs.filter((idx) => {
      const filters = filtersByIndex.get(idx) || []
      return Boolean(textQuery || geo || filters.length > 0)
    })

    if (searchableIndexes.length === 0) {
      return null
    }

    const words = textQuery.trim().split(/\s+/)
    const fetchLimit = (limit ? limit + 1 : DEFAULT_PAGE_SIZE + 1) + (offset ?? 0)
    let vector: SearchBackendVectorQuery | undefined
    const indexesWithSupport = await Promise.all(
      searchableIndexes.map(async (idx) => ({
        idx,
        supports: await this.searchBackend.supportsVectorSearch(idx),
      })),
    )
    const hasAnySupport = indexesWithSupport.some((i) => i.supports)

    if (words.length >= 2 && words[0] !== '' && hasAnySupport) {
      vector = {
        kind: 'query' as const,
        text: textQuery,
      }
    }

    const lang = this.i18n.getLang()
    const multiResult = await this.searchBackend.multiSearch({
      searches: indexesWithSupport.map(({ idx, supports }) => ({
        collection: idx,
        query: textQuery,
        options: {
          lang,
          ...(filtersByIndex.get(idx)?.length ? { filters: filtersByIndex.get(idx) } : {}),
          geo,
          vector: supports ? vector : undefined,
          limit: fetchLimit,
        },
      })),
    })
    const results = multiResult.results

    const combinedHits: SearchBackendHit[] = []
    const seen = new Set<string>()
    let count = 0

    for (const result of results) {
      count += result.found
      for (const hit of result.hits) {
        const key = this.buildSearchKey(hit)
        if (seen.has(key)) {
          continue
        }
        seen.add(key)
        combinedHits.push(hit)
      }
    }

    const rankedHits = this.rankHits(combinedHits)
    const windowedHits = rankedHits.slice(offset ?? 0, (offset ?? 0) + (limit ? limit + 1 : 11))
    const items = await this.hydrateHits(
      windowedHits,
      searchableIndexes.length === 1 ? this.mapIndexToEntityClass(searchableIndexes[0]) : undefined,
    )
    return {
      items,
      count,
    }
  }

  async searchRelated(
    index: SearchIndex,
    sourceID: string,
    query?: string,
    limit = DEFAULT_RELATED_LIMIT,
    offset = 0,
  ) {
    if (!(await this.searchBackend.supportsVectorSearch(index))) {
      return { items: [], count: 0 }
    }

    const fetchLimit = limit + 1
    const result = await this.searchBackend.search({
      collection: index,
      query: query?.trim() ?? '',
      options: {
        lang: this.i18n.getLang(),
        filters: [this.buildExcludeIdFilter(sourceID)],
        limit: fetchLimit,
        offset,
        vector: {
          kind: 'document',
          id: sourceID,
        },
      },
    })

    const items = await this.hydrateHits(
      result.hits.slice(0, limit),
      this.mapIndexToEntityClass(index),
    )
    return {
      items,
      count: result.found,
    }
  }
}
