import { QueryOrder } from '@mikro-orm/core'
import { EntityManager, raw } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { BadRequestErr } from '@src/common/exceptions'
import { CursorOptions } from '@src/common/transform'
import { IEntityService, IsEntityService, QueryField } from '@src/db/base.entity'
import { Region } from '@src/geo/region.entity'
import { Component } from '@src/process/component.entity'
import { Process } from '@src/process/process.entity'
import { Program } from '@src/process/program.entity'
import { Variant } from '@src/product/variant.entity'
import { SearchIndex } from '@src/search/search.backend'
import { SearchService } from '@src/search/search.service'

@Injectable()
@IsEntityService(Region)
export class RegionService implements IEntityService<Region> {
  constructor(
    private readonly em: EntityManager,
    private readonly searchService: SearchService,
  ) {}

  queryFields(): Record<string, QueryField> {
    return {}
  }

  async find(opts: CursorOptions<Region>) {
    const regions = await this.em.find(Region, opts.where, opts.options)
    const count = await this.em.count(Region, opts.where)
    return {
      items: regions,
      count,
    }
  }

  async findOneByID(id: string) {
    return this.em.findOne(Region, { id })
  }

  async findManyByID(ids: string[]) {
    return this.em.find(Region, { id: { $in: ids } })
  }

  async components(regionID: string, opts: CursorOptions<Component>) {
    opts.where.region = regionID
    const items = await this.em.find(Component, opts.where, opts.options)
    const count = await this.em.count(Component, opts.where, { filters: opts.options.filters })
    return { items, count }
  }

  async processes(regionID: string, opts: CursorOptions<Process>) {
    opts.where.region = regionID
    const items = await this.em.find(Process, opts.where, opts.options)
    const count = await this.em.count(Process, opts.where, { filters: opts.options.filters })
    return { items, count }
  }

  async programs(regionID: string, opts: CursorOptions<Program>) {
    opts.where.region = regionID
    const items = await this.em.find(Program, opts.where, opts.options)
    const count = await this.em.count(Program, opts.where, { filters: opts.options.filters })
    return { items, count }
  }

  async variants(regionID: string, opts: CursorOptions<Variant>) {
    opts.where.region = regionID
    const items = await this.em.find(Variant, opts.where, opts.options)
    const count = await this.em.count(Variant, opts.where, { filters: opts.options.filters })
    return { items, count }
  }

  async findMostSpecificByPoint(args: {
    latitude: number
    longitude: number
  }): Promise<Region | null> {
    const { latitude, longitude } = args
    const results = await this.em.find(
      Region,
      {
        [raw(`ST_CoveredBy(ST_SetSrid(ST_MakePoint(?, ?), 4326)::geography, geo)`, [
          longitude,
          latitude,
        ])]: true,
      },
      { orderBy: { adminLevel: QueryOrder.DESC_NULLS_LAST }, limit: 1 },
    )
    return results[0] ?? null
  }

  async searchWithin(
    region: Region,
    query: string,
    opts: { adminLevel?: number; limit?: number; offset?: number },
  ) {
    const bbox = region.properties?.['geom:bbox']
    if (
      !bbox ||
      bbox
        .split(',')
        .map(Number)
        .some((n: number) => isNaN(n))
    ) {
      throw BadRequestErr(
        'This region does not have a valid bounding box and cannot be searched within.',
      )
    }
    return this.searchService.searchWithin(SearchIndex.REGIONS, bbox, query, opts)
  }

  async searchByPoint(args: { latitude: number; longitude: number }, opts: CursorOptions<Region>) {
    const { latitude, longitude } = args
    const where = {
      ...opts.where,
      [raw(`ST_CoveredBy(ST_SetSrid(ST_MakePoint(?, ?), 4326)::geography, geo)`, [
        longitude,
        latitude,
      ])]: true,
    }
    const regions = await this.em.find(Region, where, {
      ...opts.options,
      populate: ['id', 'name', 'placetype'],
    })
    const count = await this.em.count(Region, {
      ...opts.where,
      [raw(`ST_CoveredBy(ST_SetSrid(ST_MakePoint(?, ?), 4326)::geography, geo)`, [
        longitude,
        latitude,
      ])]: true,
    })
    return {
      items: regions,
      count,
    }
  }
}
