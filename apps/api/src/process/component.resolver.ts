import { Reference } from '@mikro-orm/core'
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { AuthUser, type ReqUser } from '@src/auth/auth.guard'
import { OptionalAuth } from '@src/auth/decorators'
import { DeleteInput } from '@src/changes/change-ext.model'
import { Change } from '@src/changes/change.model'
import { EditService } from '@src/changes/edit.service'
import { NotFoundErr } from '@src/common/exceptions'
import { TransformService } from '@src/common/transform'
import { Region } from '@src/geo/region.model'
import { RegionService } from '@src/geo/region.service'
import { DeleteOutput, ModelEditSchema } from '@src/graphql/base.model'
import { Component as ComponentEntity } from '@src/process/component.entity'
import {
  Component,
  ComponentHistory,
  ComponentHistoryArgs,
  ComponentHistoryConnection,
  ComponentMaterial,
  ComponentRecycleArgs,
  ComponentReduceArgs,
  ComponentReuseArgs,
  ComponentsArgs,
  ComponentsConnection,
  ComponentSource,
  ComponentSourcesArgs,
  ComponentSourcesConnection,
  ComponentTagsArgs,
  CreateComponentInput,
  CreateComponentOutput,
  UpdateComponentInput,
  UpdateComponentOutput,
} from '@src/process/component.model'
import { ComponentSchemaService } from '@src/process/component.schema'
import { ComponentService } from '@src/process/component.service'
import { Material } from '@src/process/material.model'
import { MaterialService } from '@src/process/material.service'
import { Tag, TagConnection } from '@src/process/tag.model'
import { Image, ImagesArgs, ImagesConnection } from '@src/product/image.model'
import { RelatedArgs } from '@src/search/related.model'
import { SearchIndex } from '@src/search/search.backend'
import { SearchService } from '@src/search/search.service'
import { User } from '@src/users/users.model'

@Resolver(() => Component)
export class ComponentResolver {
  constructor(
    private readonly componentService: ComponentService,
    private readonly componentSchemaService: ComponentSchemaService,
    private readonly transform: TransformService,
    private readonly regionService: RegionService,
    private readonly materialService: MaterialService,
    private readonly searchService: SearchService,
  ) {}

  @Query(() => ComponentsConnection, { name: 'components' })
  @OptionalAuth()
  async components(@Args() args: ComponentsArgs): Promise<ComponentsConnection> {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ComponentsArgs, args)
    const cursorOpts = await this.transform.applySearchQuery(
      ComponentEntity,
      filter,
      this.componentService.queryFields(),
      parsedArgs,
    )

    const cursor = await this.componentService.find(cursorOpts)
    return this.transform.entityToPaginated(Component, ComponentsConnection, cursor, parsedArgs)
  }

  @Query(() => Component, { name: 'component', nullable: true })
  @OptionalAuth()
  async component(@Args('id', { type: () => ID }) id: string): Promise<Component> {
    const component = await this.componentService.findOneByID(id)
    if (!component) {
      throw NotFoundErr('Component not found')
    }
    return this.transform.entityToModel(Component, component)
  }

  @Query(() => ModelEditSchema, { nullable: true })
  @OptionalAuth()
  async componentSchema(): Promise<ModelEditSchema> {
    return {
      model: 'Component',
      create: {
        schema: this.componentSchemaService.CreateJSONSchema,
        uischema: this.componentSchemaService.CreateUISchema,
      },
      update: {
        schema: this.componentSchemaService.UpdateJSONSchema,
        uischema: this.componentSchemaService.UpdateUISchema,
      },
    }
  }

  @ResolveField(() => Region, { nullable: true })
  async region(@Parent() component: Component) {
    if (!component.region?.id) return null
    const entity = await this.regionService.findOneByID(component.region.id)
    return entity ? this.transform.entityToModel(Region, entity) : null
  }

  @ResolveField()
  async primaryMaterial(@Parent() component: Component) {
    const material = await this.componentService.primaryMaterial(component.id)
    if (!material) {
      return null
    }
    return this.transform.entityToModel(Material, material)
  }

  @ResolveField(() => [ComponentMaterial])
  async materials(@Parent() component: Component) {
    const materials = await this.componentService.materials(component.id)
    return materials.map(async (m) => {
      const model = new ComponentMaterial()
      model.material = await this.transform.entityToModel(Material, m.material)
      model.materialFraction = m.materialFraction
      return model
    })
  }

  @ResolveField(() => TagConnection)
  async tags(@Parent() component: Component, @Args() args: ComponentTagsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ComponentTagsArgs, args)
    const cursor = await this.componentService.tags(component.id, filter)
    return this.transform.entityToPaginated(Tag, TagConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async recycle(@Parent() component: Component, @Args() args: ComponentRecycleArgs) {
    const recycle = await this.componentService.recycle(component.id, args.regionID)
    if (!recycle) {
      return null
    }
    return recycle
  }

  @ResolveField()
  async recycleScore(@Parent() component: Component, @Args() args: ComponentRecycleArgs) {
    const score = await this.componentService.recycleScore(component.id, args.regionID)
    if (!score) {
      return null
    }
    return score
  }

  @ResolveField()
  async reduce(@Parent() component: Component, @Args() args: ComponentReduceArgs) {
    const result = await this.componentService.reduce(component.id, args.regionID)
    if (!result) return null
    return result
  }

  @ResolveField()
  async reduceScore(@Parent() component: Component, @Args() args: ComponentReduceArgs) {
    const score = await this.componentService.reduceScore(component.id, args.regionID)
    if (!score) return null
    return score
  }

  @ResolveField()
  async reuse(@Parent() component: Component, @Args() args: ComponentReuseArgs) {
    const result = await this.componentService.reuse(component.id, args.regionID)
    if (!result) return null
    return result
  }

  @ResolveField()
  async reuseScore(@Parent() component: Component, @Args() args: ComponentReuseArgs) {
    const score = await this.componentService.reuseScore(component.id, args.regionID)
    if (!score) return null
    return score
  }

  @Mutation(() => CreateComponentOutput, {
    name: 'createComponent',
    nullable: true,
  })
  async createComponent(
    @Args('input') input: CreateComponentInput,
    @AuthUser() user: ReqUser,
  ): Promise<CreateComponentOutput> {
    input = await this.componentSchemaService.parseCreateInput(input)
    const created = await this.componentService.create(input, user.id)
    const model = await this.transform.entityToModel(Component, created.component)
    if (created.change) {
      const change = await this.transform.entityToModel(Change, created.change)
      return { component: model, change }
    }
    return { component: model }
  }

  @Mutation(() => UpdateComponentOutput, {
    name: 'updateComponent',
    nullable: true,
  })
  async updateComponent(
    @Args('input') input: UpdateComponentInput,
    @AuthUser() user: ReqUser,
  ): Promise<UpdateComponentOutput> {
    input = await this.componentSchemaService.parseUpdateInput(input)
    const updated = await this.componentService.update(input, user.id)
    const model = await this.transform.entityToModel(Component, updated.component)
    if (updated.change) {
      const change = await this.transform.entityToModel(Change, updated.change)
      const currentComponent = updated.currentComponent
        ? await this.transform.entityToModel(Component, updated.currentComponent)
        : undefined
      return { component: model, change, currentComponent }
    }
    return { component: model }
  }

  @Mutation(() => DeleteOutput, { name: 'deleteComponent', nullable: true })
  async deleteComponent(@Args('input') input: DeleteInput): Promise<DeleteOutput> {
    input = await this.componentSchemaService.parseDeleteInput(input)
    const component = await this.componentService.delete(input)
    return { success: true, id: component.id }
  }

  @ResolveField(() => ImagesConnection)
  async images(@Parent() component: Component, @Args() args: ImagesArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ImagesArgs, args)
    const cursor = await this.componentService.images(component.id, filter)
    return this.transform.entityToPaginated(Image, ImagesConnection, cursor, parsedArgs)
  }

  @ResolveField(() => ComponentsConnection)
  async related(@Parent() component: Component, @Args() args: RelatedArgs) {
    const parsedArgs = await this.searchService.parseRelatedArgs(args)
    const cursor = await this.searchService.searchRelated(
      SearchIndex.COMPONENTS,
      component.id,
      parsedArgs.query,
      parsedArgs.limit,
      parsedArgs.offset,
    )
    return this.transform.entitiesToOffsetPaginated(
      Component,
      ComponentsConnection,
      cursor,
      parsedArgs,
    )
  }

  @ResolveField(() => ComponentSourcesConnection)
  async sources(@Parent() component: Component, @Args() args: ComponentSourcesArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ComponentSourcesArgs, args)
    const cursor = await this.componentService.sources(component.id, filter)
    return this.transform.entityToPaginated(
      ComponentSource,
      ComponentSourcesConnection,
      cursor,
      parsedArgs,
    )
  }

  @ResolveField(() => ComponentHistoryConnection)
  async history(@Parent() component: Component, @Args() args: ComponentHistoryArgs) {
    const [, filter] = await this.transform.paginationArgs(ComponentHistoryArgs, args)
    const cursor = await this.componentService.history(component.id, filter)
    const items = await Promise.all(
      cursor.items.map((h) => this.transform.entityToModel(ComponentHistory, h)),
    )
    return this.transform.objectsToPaginated(
      ComponentHistoryConnection,
      { items, count: cursor.count },
      true,
    )
  }
}

@Resolver(() => ComponentMaterial)
export class ComponentMaterialResolver {
  constructor(
    private readonly transform: TransformService,
    private readonly materialService: MaterialService,
  ) {}

  @ResolveField(() => Material)
  async material(@Parent() cm: ComponentMaterial): Promise<Material> {
    if (cm.material instanceof Material) {
      return cm.material
    }
    const material = await this.materialService.findOneByID((cm.material as any).id)
    if (!material) throw new Error(`Material not found for component material`)
    return this.transform.entityToModel(Material, material)
  }
}

@Resolver(() => ComponentHistory)
export class ComponentHistoryResolver {
  constructor(
    private readonly transform: TransformService,
    private readonly editService: EditService,
  ) {}

  @ResolveField('user', () => User)
  async user(@Parent() history: ComponentHistory) {
    if (history.user instanceof User) {
      return history.user
    }
    if (Reference.isReference(history.user)) {
      history.user = await history.user.loadOrFail()
    }
    return this.transform.entityToModel(User, history.user)
  }

  @ResolveField('original', () => Component, { nullable: true })
  async historyOriginal(@Parent() history: ComponentHistory) {
    const original = history.original
    if (!original) {
      return null
    }
    const entity = await this.editService.changePOJOToEntity(ComponentEntity, original)
    return this.transform.entityToModel(Component, entity)
  }

  @ResolveField('changes', () => Component, { nullable: true })
  async historyChanges(@Parent() history: ComponentHistory) {
    const changes = history.changes
    if (!changes) {
      return null
    }
    const entity = await this.editService.changePOJOToEntity(ComponentEntity, changes)
    return this.transform.entityToModel(Component, entity)
  }
}
