import { Reference } from '@mikro-orm/core'
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { AuthUser, type ReqUser } from '@src/auth/auth.guard'
import { OptionalAuth } from '@src/auth/decorators'
import { DeleteInput } from '@src/changes/change-ext.model'
import { Change } from '@src/changes/change.model'
import { EditService } from '@src/changes/edit.service'
import { TrackEntityView } from '@src/common/entity-view.decorator'
import { NotFoundErr } from '@src/common/exceptions'
import { TransformService } from '@src/common/transform'
import { Region, RegionsConnection } from '@src/geo/region.model'
import { DeleteOutput, ModelEditSchema } from '@src/graphql/base.model'
import { Component, ComponentsConnection } from '@src/process/component.model'
import { Process, ProcessConnection } from '@src/process/process.model'
import { Tag, TagConnection } from '@src/process/tag.model'
import { Image, ImagesArgs, ImagesConnection } from '@src/product/image.model'
import { Item, ItemsConnection } from '@src/product/item.model'
import { Variant as VariantEntity } from '@src/product/variant.entity'
import {
  CreateVariantInput,
  CreateVariantOutput,
  UpdateVariantInput,
  UpdateVariantOutput,
  Variant,
  VariantComponent,
  VariantComponentsArgs,
  VariantComponentsConnection,
  VariantHistory,
  VariantHistoryArgs,
  VariantHistoryConnection,
  VariantItemsArgs,
  VariantOrg,
  VariantOrgsArgs,
  VariantOrgsConnection,
  VariantProcessesArgs,
  VariantRecycle,
  VariantRecycleArgs,
  VariantRecycleComponentsArgs,
  VariantReduce,
  VariantReduceArgs,
  VariantReduceComponentsArgs,
  VariantRegionsArgs,
  VariantReuse,
  VariantReuseArgs,
  VariantReuseComponentsArgs,
  VariantsArgs,
  VariantsConnection,
  VariantSource,
  VariantSourcesArgs,
  VariantSourcesConnection,
  VariantTagsArgs,
} from '@src/product/variant.model'
import { VariantSchemaService } from '@src/product/variant.schema'
import { VariantService } from '@src/product/variant.service'
import { RelatedArgs } from '@src/search/related.model'
import { SearchIndex } from '@src/search/search.backend'
import { SearchService } from '@src/search/search.service'
import { User } from '@src/users/users.model'

@Resolver(() => Variant)
export class VariantResolver {
  constructor(
    private readonly variantService: VariantService,
    private readonly transform: TransformService,
    private readonly variantSchemaService: VariantSchemaService,
    private readonly searchService: SearchService,
  ) {}

  @Query(() => VariantsConnection, { name: 'variants' })
  @OptionalAuth()
  async variants(@Args() args: VariantsArgs): Promise<VariantsConnection> {
    const [parsedArgs, filter] = await this.transform.paginationArgs(VariantsArgs, args)
    const cursor = await this.variantService.find(filter)
    return this.transform.entityToPaginated(Variant, VariantsConnection, cursor, parsedArgs)
  }

  @Query(() => Variant, { name: 'variant', nullable: true })
  @OptionalAuth()
  @TrackEntityView('variant')
  async variant(@Args('id', { type: () => ID }) id: string): Promise<Variant> {
    const variant = await this.variantService.findOneByID(id)
    if (!variant) {
      throw NotFoundErr('Variant not found')
    }
    const result = await this.transform.entityToModel(Variant, variant)
    return result
  }

  @Query(() => ModelEditSchema, { nullable: true })
  @OptionalAuth()
  async variantSchema(): Promise<ModelEditSchema> {
    return {
      model: 'Variant',
      create: {
        schema: this.variantSchemaService.CreateJSONSchema,
        uischema: this.variantSchemaService.CreateUISchema,
      },
      update: {
        schema: this.variantSchemaService.UpdateJSONSchema,
        uischema: this.variantSchemaService.UpdateUISchema,
      },
    }
  }

  @ResolveField()
  async items(@Parent() variant: Variant, @Args() args: VariantItemsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(VariantItemsArgs, args)
    const cursor = await this.variantService.items(variant.id, filter)
    return this.transform.entityToPaginated(Item, ItemsConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async processes(@Parent() variant: Variant, @Args() args: VariantProcessesArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(VariantProcessesArgs, args)
    const cursor = await this.variantService.processes(variant.id, filter)
    return this.transform.entityToPaginated(Process, ProcessConnection, cursor, parsedArgs)
  }

  @ResolveField(() => VariantsConnection)
  async related(@Parent() variant: Variant, @Args() args: RelatedArgs) {
    const parsedArgs = await this.searchService.parseRelatedArgs(args)
    const cursor = await this.searchService.searchRelated(
      SearchIndex.VARIANTS,
      variant.id,
      parsedArgs.query,
      parsedArgs.limit,
      parsedArgs.offset,
    )
    return this.transform.entitiesToOffsetPaginated(Variant, VariantsConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async orgs(@Parent() variant: Variant, @Args() args: VariantOrgsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(VariantOrgsArgs, args)
    const cursor = await this.variantService.orgs(variant.id, filter)
    return this.transform.entityToPaginated(VariantOrg, VariantOrgsConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async tags(@Parent() variant: Variant, @Args() args: VariantTagsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(VariantTagsArgs, args)
    const cursor = await this.variantService.tags(variant.id, filter)
    return this.transform.entityToPaginated(Tag, TagConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async components(@Parent() variant: Variant, @Args() args: VariantComponentsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(VariantComponentsArgs, args)
    const cursor = await this.variantService.components(variant.id, filter)
    return this.transform.entityToPaginated(
      VariantComponent,
      VariantComponentsConnection,
      cursor,
      parsedArgs,
    )
  }

  @ResolveField()
  async recycleScore(@Parent() variant: Variant, @Args() args: VariantRecycleArgs) {
    const score = await this.variantService.recycleScore(variant.id, args.regionID)
    if (!score) {
      return null
    }
    return score
  }

  @ResolveField(() => [VariantRecycle])
  async recycle(@Parent() variant: Variant, @Args() args: VariantRecycleArgs) {
    return this.variantService.recycle(variant.id, args.regionID)
  }

  @ResolveField(() => [VariantReduce])
  async reduce(@Parent() variant: Variant, @Args() args: VariantReduceArgs) {
    return this.variantService.reduce(variant.id, args.regionID)
  }

  @ResolveField()
  async reduceScore(@Parent() variant: Variant, @Args() args: VariantReduceArgs) {
    const score = await this.variantService.reduceScore(variant.id, args.regionID)
    if (!score) return null
    return score
  }

  @ResolveField(() => [VariantReuse])
  async reuse(@Parent() variant: Variant, @Args() args: VariantReuseArgs) {
    return this.variantService.reuse(variant.id, args.regionID)
  }

  @ResolveField()
  async reuseScore(@Parent() variant: Variant, @Args() args: VariantReuseArgs) {
    const score = await this.variantService.reuseScore(variant.id, args.regionID)
    if (!score) return null
    return score
  }

  @Mutation(() => CreateVariantOutput, {
    name: 'createVariant',
    nullable: true,
  })
  async createVariant(
    @Args('input') input: CreateVariantInput,
    @AuthUser() user: ReqUser,
  ): Promise<CreateVariantOutput> {
    input = await this.variantSchemaService.parseCreateInput(input)
    const created = await this.variantService.create(input, user.id)
    const result = await this.transform.entityToModel(Variant, created.variant)
    if (!created.change) {
      return { variant: result }
    }
    const change = await this.transform.entityToModel(Change, created.change)
    return { change, variant: result }
  }

  @Mutation(() => UpdateVariantOutput, {
    name: 'updateVariant',
    nullable: true,
  })
  async updateVariant(
    @Args('input') input: UpdateVariantInput,
    @AuthUser() user: ReqUser,
  ): Promise<UpdateVariantOutput> {
    input = await this.variantSchemaService.parseUpdateInput(input)
    const updated = await this.variantService.update(input, user.id)
    const result = await this.transform.entityToModel(Variant, updated.variant)
    if (!updated.change) {
      return { variant: result }
    }
    const change = await this.transform.entityToModel(Change, updated.change)
    const currentVariant = updated.currentVariant
      ? await this.transform.entityToModel(Variant, updated.currentVariant)
      : undefined
    return { change, variant: result, currentVariant }
  }

  @Mutation(() => DeleteOutput, { name: 'deleteVariant', nullable: true })
  async deleteVariant(@Args('input') input: DeleteInput): Promise<DeleteOutput> {
    input = await this.variantSchemaService.parseDeleteInput(input)
    const variant = await this.variantService.delete(input)
    if (!variant) {
      throw NotFoundErr(`Variant with ID "${input.id}" not found`)
    }
    return { success: true, id: variant.id }
  }

  @ResolveField(() => RegionsConnection)
  async regions(@Parent() variant: Variant, @Args() args: VariantRegionsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(VariantRegionsArgs, args)
    const cursor = await this.variantService.regions(variant.id, filter)
    return this.transform.entityToPaginated(Region, RegionsConnection, cursor, parsedArgs)
  }

  @ResolveField(() => ImagesConnection)
  async images(@Parent() variant: Variant, @Args() args: ImagesArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ImagesArgs, args)
    const cursor = await this.variantService.images(variant.id, filter)
    return this.transform.entityToPaginated(Image, ImagesConnection, cursor, parsedArgs)
  }

  @ResolveField(() => String, { nullable: true })
  async imageURL(@Parent() variant: Variant) {
    const cursor = await this.variantService.images(variant.id, {
      where: {},
      options: { limit: 1 },
    })
    if (!cursor.items[0]) return null
    const image = await this.transform.entityToModel(Image, cursor.items[0])
    return image.url
  }

  @ResolveField(() => VariantSourcesConnection)
  async sources(@Parent() variant: Variant, @Args() args: VariantSourcesArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(VariantSourcesArgs, args)
    const cursor = await this.variantService.sources(variant.id, filter)
    return this.transform.entityToPaginated(
      VariantSource,
      VariantSourcesConnection,
      cursor,
      parsedArgs,
    )
  }

  @ResolveField(() => VariantHistoryConnection)
  async history(@Parent() variant: Variant, @Args() args: VariantHistoryArgs) {
    const [, filter] = await this.transform.paginationArgs(VariantHistoryArgs, args)
    const cursor = await this.variantService.history(variant.id, filter)
    const items = await Promise.all(
      cursor.items.map((h) => this.transform.entityToModel(VariantHistory, h)),
    )
    return this.transform.objectsToPaginated(
      VariantHistoryConnection,
      { items, count: cursor.count },
      true,
    )
  }
}

@Resolver(() => VariantRecycle)
export class VariantRecycleResolver {
  constructor(
    private readonly variantService: VariantService,
    private readonly transform: TransformService,
  ) {}

  @ResolveField(() => ComponentsConnection)
  async components(
    @Parent() parent: VariantRecycle,
    @Args() args: VariantRecycleComponentsArgs,
  ): Promise<ComponentsConnection> {
    const [parsedArgs, filter] = await this.transform.paginationArgs(
      VariantRecycleComponentsArgs,
      args,
    )
    const cursor = await this.variantService.componentsByIds(parent.componentIds, filter)
    return this.transform.entityToPaginated(Component, ComponentsConnection, cursor, parsedArgs)
  }
}

@Resolver(() => VariantReduce)
export class VariantReduceResolver {
  constructor(
    private readonly variantService: VariantService,
    private readonly transform: TransformService,
  ) {}

  @ResolveField(() => ComponentsConnection)
  async components(
    @Parent() parent: VariantReduce,
    @Args() args: VariantReduceComponentsArgs,
  ): Promise<ComponentsConnection> {
    const [parsedArgs, filter] = await this.transform.paginationArgs(
      VariantReduceComponentsArgs,
      args,
    )
    const cursor = await this.variantService.componentsByIds(parent.componentIds, filter)
    return this.transform.entityToPaginated(Component, ComponentsConnection, cursor, parsedArgs)
  }
}

@Resolver(() => VariantReuse)
export class VariantReuseResolver {
  constructor(
    private readonly variantService: VariantService,
    private readonly transform: TransformService,
  ) {}

  @ResolveField(() => ComponentsConnection)
  async components(
    @Parent() parent: VariantReuse,
    @Args() args: VariantReuseComponentsArgs,
  ): Promise<ComponentsConnection> {
    const [parsedArgs, filter] = await this.transform.paginationArgs(
      VariantReuseComponentsArgs,
      args,
    )
    const cursor = await this.variantService.componentsByIds(parent.componentIds, filter)
    return this.transform.entityToPaginated(Component, ComponentsConnection, cursor, parsedArgs)
  }
}

@Resolver(() => VariantHistory)
export class VariantHistoryResolver {
  constructor(
    private readonly transform: TransformService,
    private readonly editService: EditService,
  ) {}

  @ResolveField('user', () => User)
  async user(@Parent() history: VariantHistory) {
    if (history.user instanceof User) {
      return history.user
    }
    if (Reference.isReference(history.user)) {
      history.user = await history.user.loadOrFail()
    }
    return this.transform.entityToModel(User, history.user)
  }

  @ResolveField('original', () => Variant, { nullable: true })
  async historyOriginal(@Parent() history: VariantHistory) {
    const original = history.original
    if (!original) {
      return null
    }
    const entity = await this.editService.changePOJOToEntity(VariantEntity, original)
    return this.transform.entityToModel(Variant, entity)
  }

  @ResolveField('changes', () => Variant, { nullable: true })
  async historyChanges(@Parent() history: VariantHistory) {
    const changes = history.changes
    if (!changes) {
      return null
    }
    const entity = await this.editService.changePOJOToEntity(VariantEntity, changes)
    return this.transform.entityToModel(Variant, entity)
  }
}
