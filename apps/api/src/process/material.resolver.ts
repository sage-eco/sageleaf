import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { OptionalAuth } from '@src/auth/decorators'
import { TrackEntityView } from '@src/common/entity-view.decorator'
import { NotFoundErr } from '@src/common/exceptions'
import { TransformService } from '@src/common/transform'
import { Component, ComponentsConnection } from '@src/process/component.model'
import {
  ComponentsArgs,
  Material,
  MaterialsArgs,
  MaterialsConnection,
  PrimaryComponentsArgs,
  ProcessesArgs,
} from '@src/process/material.model'
import { MaterialService } from '@src/process/material.service'
import { Process, ProcessConnection } from '@src/process/process.model'
import { RelatedArgs } from '@src/search/related.model'
import { SearchIndex } from '@src/search/search.backend'
import { SearchService } from '@src/search/search.service'

@Resolver(() => Material)
export class MaterialResolver {
  constructor(
    private readonly materialService: MaterialService,
    private readonly transform: TransformService,
    private readonly searchService: SearchService,
  ) {}

  @Query(() => MaterialsConnection, { name: 'materials' })
  @OptionalAuth()
  async materials(@Args() args: MaterialsArgs): Promise<MaterialsConnection> {
    const [parsedArgs, filter] = await this.transform.paginationArgs(MaterialsArgs, args)
    const cursor = await this.materialService.find(filter)
    return this.transform.entityToPaginated(Material, MaterialsConnection, cursor, parsedArgs)
  }

  @Query(() => Material, { name: 'material', nullable: true })
  @OptionalAuth()
  @TrackEntityView('material')
  async material(@Args('id', { type: () => ID }) id: string): Promise<Material> {
    const material = await this.materialService.findOneByID(id)
    if (!material) {
      throw NotFoundErr('Material not found')
    }
    const model = await this.transform.entityToModel(Material, material)
    return model
  }

  @Query(() => Material, { name: 'materialRoot' })
  @OptionalAuth()
  async materialRoot(): Promise<Material> {
    const material = await this.materialService.findRoot()
    if (!material) {
      throw NotFoundErr('Root material not found')
    }
    const model = await this.transform.entityToModel(Material, material)
    return model
  }

  @ResolveField()
  async parents(@Parent() material: Material, @Args() args: MaterialsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(MaterialsArgs, args)
    const cursor = await this.materialService.findParents(material.id, filter)
    return this.transform.entityToPaginated(Material, MaterialsConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async children(@Parent() material: Material, @Args() args: MaterialsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(MaterialsArgs, args)
    const cursor = await this.materialService.findChildren(material.id, filter)
    return this.transform.entityToPaginated(Material, MaterialsConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async ancestors(@Parent() material: Material, @Args() args: MaterialsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(MaterialsArgs, args)
    const cursor = await this.materialService.findDirectAncestors(material.id, filter)
    return this.transform.entityToPaginated(Material, MaterialsConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async descendants(@Parent() material: Material, @Args() args: MaterialsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(MaterialsArgs, args)
    const cursor = await this.materialService.findDirectDescendants(material.id, filter)
    return this.transform.entityToPaginated(Material, MaterialsConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async primaryComponents(@Parent() material: Material, @Args() args: PrimaryComponentsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(PrimaryComponentsArgs, args)
    const cursor = await this.materialService.primaryComponents(material.id, filter)
    return this.transform.entityToPaginated(Component, ComponentsConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async components(@Parent() material: Material, @Args() args: ComponentsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ComponentsArgs, args)
    const cursor = await this.materialService.components(material.id, filter)
    return this.transform.entityToPaginated(Component, ComponentsConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async processes(@Parent() material: Material, @Args() args: ProcessesArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ProcessesArgs, args)
    const cursor = await this.materialService.processes(material.id, filter)
    return this.transform.entityToPaginated(Process, ProcessConnection, cursor, parsedArgs)
  }

  @ResolveField(() => MaterialsConnection)
  async related(@Parent() material: Material, @Args() args: RelatedArgs) {
    const parsedArgs = await this.searchService.parseRelatedArgs(args)
    const cursor = await this.searchService.searchRelated(
      SearchIndex.MATERIALS,
      material.id,
      parsedArgs.query,
      parsedArgs.limit,
      parsedArgs.offset,
    )
    return this.transform.entitiesToOffsetPaginated(
      Material,
      MaterialsConnection,
      cursor,
      parsedArgs,
    )
  }
}
