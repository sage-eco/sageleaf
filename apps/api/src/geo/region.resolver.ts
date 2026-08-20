import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { OptionalAuth } from '@src/auth/decorators'
import { TrackEntityView } from '@src/common/entity-view.decorator'
import { NotFoundErr } from '@src/common/exceptions'
import { TransformService } from '@src/common/transform'
import { LocationService } from '@src/geo/location.service'
import { Region as RegionEntity } from '@src/geo/region.entity'
import {
  CurrentRegion,
  Region,
  RegionComponentsArgs,
  RegionProcessesArgs,
  RegionProgramsArgs,
  RegionsArgs,
  RegionsConnection,
  RegionSearchWithinArgs,
  RegionsSearchByPointArgs,
  RegionVariantsArgs,
} from '@src/geo/region.model'
import { RegionService } from '@src/geo/region.service'
import { Component, ComponentsConnection } from '@src/process/component.model'
import { Process, ProcessConnection } from '@src/process/process.model'
import { Program, ProgramsConnection } from '@src/process/program.model'
import { Variant, VariantsConnection } from '@src/product/variant.model'

@Resolver(() => Region)
export class RegionResolver {
  constructor(
    private readonly regionService: RegionService,
    private readonly locationService: LocationService,
    private readonly transform: TransformService,
  ) {}

  @Query(() => RegionsConnection, { name: 'regions' })
  @OptionalAuth()
  async regions(@Args() args: RegionsArgs): Promise<RegionsConnection> {
    const [parsedArgs, filter] = await this.transform.paginationArgs(RegionsArgs, args)
    const cursor = await this.regionService.find(filter, args.query)
    return this.transform.entityToPaginated(Region, RegionsConnection, cursor, parsedArgs)
  }

  @Query(() => Region, { name: 'region', nullable: true })
  @OptionalAuth()
  @TrackEntityView('region')
  async region(@Args('id', { type: () => ID }) id: string) {
    const region = await this.regionService.findOneByID(id)
    if (!region) {
      throw NotFoundErr('Region not found')
    }
    return this.transform.entityToModel(Region, region)
  }

  @Query(() => CurrentRegion, { name: 'currentRegion', nullable: true })
  @OptionalAuth()
  async currentRegion(): Promise<CurrentRegion | null> {
    const ids = await this.locationService.resolveLocation()
    if (!ids || ids.length === 0) return null

    const [region, allRegions] = await Promise.all([
      this.regionService.findOneByID(ids[0]),
      this.regionService.findManyByID(ids),
    ])

    const sorted = allRegions.sort((a, b) => (b.adminLevel ?? 0) - (a.adminLevel ?? 0))
    const [regionModel, ...hierarchyModels] = await Promise.all([
      region ? this.transform.entityToModel(Region, region) : Promise.resolve(undefined),
      ...sorted.map((r) => this.transform.entityToModel(Region, r)),
    ])

    return {
      region: regionModel,
      regionHierarchy: hierarchyModels,
    }
  }

  private hierarchyParentID(
    entity: RegionEntity,
    preferred: number,
    fallback: number,
  ): string | null {
    const hierarchy = entity.properties?.hierarchy ?? []
    const entry =
      hierarchy.find((h) => h.admin_level === preferred) ??
      hierarchy.find((h) => h.admin_level === fallback)
    return entry ? `wof_${entry.id}` : null
  }

  @ResolveField(() => Region, { nullable: true })
  async county(@Parent() region: Region): Promise<Region | null> {
    const entity = await this.regionService.findOneByID(region.id)
    if (!entity) return null
    const parentID = this.hierarchyParentID(entity, 6, 5)
    if (!parentID) return null
    const parent = await this.regionService.findOneByID(parentID)
    if (!parent) return null
    return this.transform.entityToModel(Region, parent)
  }

  @ResolveField(() => Region, { nullable: true })
  async province(@Parent() region: Region): Promise<Region | null> {
    const entity = await this.regionService.findOneByID(region.id)
    if (!entity) return null
    const parentID = this.hierarchyParentID(entity, 4, 3)
    if (!parentID) return null
    const parent = await this.regionService.findOneByID(parentID)
    if (!parent) return null
    return this.transform.entityToModel(Region, parent)
  }

  @ResolveField(() => Region, { nullable: true })
  async country(@Parent() region: Region): Promise<Region | null> {
    const entity = await this.regionService.findOneByID(region.id)
    if (!entity) return null
    const parentID = this.hierarchyParentID(entity, 2, 1)
    if (!parentID) return null
    const parent = await this.regionService.findOneByID(parentID)
    if (!parent) return null
    return this.transform.entityToModel(Region, parent)
  }

  @ResolveField(() => RegionsConnection)
  async searchWithin(
    @Parent() region: Region,
    @Args() args: RegionSearchWithinArgs,
  ): Promise<RegionsConnection> {
    const entity = await this.regionService.findOneByID(region.id)
    if (!entity)
      return this.transform.objectsToPaginated(RegionsConnection, { items: [], count: 0 }, true)
    const cursor = await this.regionService.searchWithin(entity, args.query, {
      adminLevel: args.adminLevel,
      limit: args.limit,
      offset: args.offset,
    })
    const models = await Promise.all(
      cursor.items.map((e) => this.transform.entityToModel(Region, e)),
    )
    return this.transform.objectsToPaginated(
      RegionsConnection,
      { items: models, count: cursor.count },
      true,
    )
  }

  @ResolveField()
  async components(@Parent() region: Region, @Args() args: RegionComponentsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(RegionComponentsArgs, args)
    const cursor = await this.regionService.components(region.id, filter)
    return this.transform.entityToPaginated(Component, ComponentsConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async processes(@Parent() region: Region, @Args() args: RegionProcessesArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(RegionProcessesArgs, args)
    const cursor = await this.regionService.processes(region.id, filter)
    return this.transform.entityToPaginated(Process, ProcessConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async programs(@Parent() region: Region, @Args() args: RegionProgramsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(RegionProgramsArgs, args)
    const cursor = await this.regionService.programs(region.id, filter)
    return this.transform.entityToPaginated(Program, ProgramsConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async variants(@Parent() region: Region, @Args() args: RegionVariantsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(RegionVariantsArgs, args)
    const cursor = await this.regionService.variants(region.id, filter)
    return this.transform.entityToPaginated(Variant, VariantsConnection, cursor, parsedArgs)
  }

  @Query(() => RegionsConnection, { name: 'searchRegionsByPoint' })
  @OptionalAuth()
  async searchRegionsByPoint(@Args() args: RegionsSearchByPointArgs): Promise<RegionsConnection> {
    const [parsedArgs, filter] = await this.transform.paginationArgs(RegionsSearchByPointArgs, args)
    const cursor = await this.regionService.searchByPoint(
      {
        latitude: args.latlong[0],
        longitude: args.latlong[1],
      },
      filter,
    )
    return this.transform.entityToPaginated(Region, RegionsConnection, cursor, parsedArgs)
  }
}
