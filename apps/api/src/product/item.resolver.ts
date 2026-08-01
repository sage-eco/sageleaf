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
import { DeleteOutput, ModelEditSchema } from '@src/graphql/base.model'
import { Component, ComponentsConnection } from '@src/process/component.model'
import { Tag, TagConnection } from '@src/process/tag.model'
import { CategoriesConnection, Category } from '@src/product/category.model'
import { Item as ItemEntity } from '@src/product/item.entity'
import {
  CreateItemInput,
  CreateItemOutput,
  Item,
  ItemCategoriesArgs,
  ItemHistory,
  ItemHistoryArgs,
  ItemHistoryConnection,
  ItemRecycle,
  ItemRecycleArgs,
  ItemRecycleComponentsArgs,
  ItemRecycleVariantsArgs,
  ItemReduce,
  ItemReduceArgs,
  ItemReduceComponentsArgs,
  ItemReduceVariantsArgs,
  ItemReuse,
  ItemReuseArgs,
  ItemReuseComponentsArgs,
  ItemReuseVariantsArgs,
  ItemsArgs,
  ItemsConnection,
  ItemTagsArgs,
  ItemVariantsArgs,
  UpdateItemInput,
  UpdateItemOutput,
} from '@src/product/item.model'
import { ItemSchemaService } from '@src/product/item.schema'
import { ItemService } from '@src/product/item.service'
import { Variant, VariantsConnection } from '@src/product/variant.model'
import { RelatedArgs } from '@src/search/related.model'
import { SearchIndex } from '@src/search/search.backend'
import { SearchService } from '@src/search/search.service'
import { User } from '@src/users/users.model'

@Resolver(() => Item)
export class ItemResolver {
  constructor(
    private readonly itemService: ItemService,
    private readonly transform: TransformService,
    private readonly itemSchemaService: ItemSchemaService,
    private readonly searchService: SearchService,
  ) {}

  @Query(() => ItemsConnection, { name: 'items' })
  @OptionalAuth()
  async items(@Args() args: ItemsArgs): Promise<ItemsConnection> {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ItemsArgs, args)
    const cursor = await this.itemService.find(filter)
    return this.transform.entityToPaginated(Item, ItemsConnection, cursor, parsedArgs)
  }

  @Query(() => Item, { name: 'item', nullable: true })
  @OptionalAuth()
  @TrackEntityView('item')
  async item(@Args('id', { type: () => ID }) id: string): Promise<Item> {
    const item = await this.itemService.findOneByID(id)
    if (!item) {
      throw NotFoundErr('Item not found')
    }
    const result = await this.transform.entityToModel(Item, item)
    return result
  }

  @Query(() => ModelEditSchema, { nullable: true })
  @OptionalAuth()
  async itemSchema(): Promise<ModelEditSchema> {
    return {
      model: 'Item',
      create: {
        schema: this.itemSchemaService.CreateJSONSchema,
        uischema: this.itemSchemaService.CreateUISchema,
      },
      update: {
        schema: this.itemSchemaService.UpdateJSONSchema,
        uischema: this.itemSchemaService.UpdateUISchema,
      },
    }
  }

  @ResolveField()
  async categories(@Parent() item: Item, @Args() args: ItemCategoriesArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ItemCategoriesArgs, args)
    const cursor = await this.itemService.categories(item.id, filter)
    return this.transform.entityToPaginated(Category, CategoriesConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async tags(@Parent() item: Item, @Args() args: ItemTagsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ItemTagsArgs, args)
    const cursor = await this.itemService.tags(item.id, filter)
    return this.transform.entityToPaginated(Tag, TagConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async variants(@Parent() item: Item, @Args() args: ItemVariantsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ItemVariantsArgs, args)
    const cursor = await this.itemService.variants(item.id, filter)
    return this.transform.entityToPaginated(Variant, VariantsConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async recycleScore(@Parent() item: Item, @Args() args: ItemRecycleArgs) {
    const score = await this.itemService.recycleScore(item.id, args.regionID)
    if (!score) {
      return null
    }
    return score
  }

  @ResolveField(() => [ItemRecycle])
  async recycle(@Parent() item: Item, @Args() args: ItemRecycleArgs) {
    return this.itemService.recycle(item.id, args.regionID)
  }

  @ResolveField(() => [ItemReduce])
  async reduce(@Parent() item: Item, @Args() args: ItemReduceArgs) {
    return this.itemService.reduce(item.id, args.regionID)
  }

  @ResolveField()
  async reduceScore(@Parent() item: Item, @Args() args: ItemReduceArgs) {
    const score = await this.itemService.reduceScore(item.id, args.regionID)
    if (!score) return null
    return score
  }

  @ResolveField(() => [ItemReuse])
  async reuse(@Parent() item: Item, @Args() args: ItemReuseArgs) {
    return this.itemService.reuse(item.id, args.regionID)
  }

  @ResolveField()
  async reuseScore(@Parent() item: Item, @Args() args: ItemReuseArgs) {
    const score = await this.itemService.reuseScore(item.id, args.regionID)
    if (!score) return null
    return score
  }

  @ResolveField()
  async related(@Parent() item: Item, @Args() args: RelatedArgs) {
    const parsedArgs = await this.searchService.parseRelatedArgs(args)
    const cursor = await this.searchService.searchRelated(
      SearchIndex.ITEMS,
      item.id,
      parsedArgs.query,
      parsedArgs.limit,
      parsedArgs.offset,
    )
    return this.transform.entitiesToOffsetPaginated(Item, ItemsConnection, cursor, parsedArgs)
  }

  @Mutation(() => CreateItemOutput, { name: 'createItem', nullable: true })
  async createItem(
    @Args('input') input: CreateItemInput,
    @AuthUser() user: ReqUser,
  ): Promise<CreateItemOutput> {
    input = await this.itemSchemaService.parseCreateInput(input)
    const created = await this.itemService.create(input, user.id)
    const result = await this.transform.entityToModel(Item, created.item)
    if (!created.change) {
      return { item: result }
    }
    const change = await this.transform.entityToModel(Change, created.change)
    return { change, item: result }
  }

  @Mutation(() => UpdateItemOutput, { name: 'updateItem', nullable: true })
  async updateItem(
    @Args('input') input: UpdateItemInput,
    @AuthUser() user: ReqUser,
  ): Promise<UpdateItemOutput> {
    input = await this.itemSchemaService.parseUpdateInput(input)
    const updated = await this.itemService.update(input, user.id)
    const result = await this.transform.entityToModel(Item, updated.item)
    if (!updated.change) {
      return { item: result }
    }
    const change = await this.transform.entityToModel(Change, updated.change)
    const currentItem = updated.currentItem
      ? await this.transform.entityToModel(Item, updated.currentItem)
      : undefined
    return { change, item: result, currentItem }
  }

  @Mutation(() => DeleteOutput, { name: 'deleteItem', nullable: true })
  async deleteItem(@Args('input') input: DeleteInput): Promise<DeleteOutput> {
    input = await this.itemSchemaService.parseDeleteInput(input)
    const item = await this.itemService.delete(input)
    if (!item) {
      throw NotFoundErr(`Item with ID "${input.id}" not found`)
    }
    return { success: true, id: item.id }
  }

  @ResolveField(() => ItemHistoryConnection)
  async history(@Parent() item: Item, @Args() args: ItemHistoryArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ItemHistoryArgs, args)
    const cursor = await this.itemService.history(item.id, filter)
    const items = await Promise.all(
      cursor.items.map((h) => this.transform.entityToModel(ItemHistory, h)),
    )
    return this.transform.objectsToPaginated(
      ItemHistoryConnection,
      { items, count: cursor.count },
      true,
      parsedArgs,
      (node: any) => node.datetime?.toISO?.() ?? '',
    )
  }
}

@Resolver(() => ItemRecycle)
export class ItemRecycleResolver {
  constructor(
    private readonly itemService: ItemService,
    private readonly transform: TransformService,
  ) {}

  @ResolveField(() => ComponentsConnection)
  async components(
    @Parent() parent: ItemRecycle,
    @Args() args: ItemRecycleComponentsArgs,
  ): Promise<ComponentsConnection> {
    const [parsedArgs, filter] = await this.transform.paginationArgs(
      ItemRecycleComponentsArgs,
      args,
    )
    const cursor = await this.itemService.componentsByIds(parent.componentIds, filter)
    return this.transform.entityToPaginated(Component, ComponentsConnection, cursor, parsedArgs)
  }

  @ResolveField(() => VariantsConnection)
  async variants(
    @Parent() parent: ItemRecycle,
    @Args() args: ItemRecycleVariantsArgs,
  ): Promise<VariantsConnection> {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ItemRecycleVariantsArgs, args)
    const cursor = await this.itemService.variantsByIds(parent.variantIds, filter)
    return this.transform.entityToPaginated(Variant, VariantsConnection, cursor, parsedArgs)
  }
}

@Resolver(() => ItemReduce)
export class ItemReduceResolver {
  constructor(
    private readonly itemService: ItemService,
    private readonly transform: TransformService,
  ) {}

  @ResolveField(() => ComponentsConnection)
  async components(
    @Parent() parent: ItemReduce,
    @Args() args: ItemReduceComponentsArgs,
  ): Promise<ComponentsConnection> {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ItemReduceComponentsArgs, args)
    const cursor = await this.itemService.componentsByIds(parent.componentIds, filter)
    return this.transform.entityToPaginated(Component, ComponentsConnection, cursor, parsedArgs)
  }

  @ResolveField(() => VariantsConnection)
  async variants(
    @Parent() parent: ItemReduce,
    @Args() args: ItemReduceVariantsArgs,
  ): Promise<VariantsConnection> {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ItemReduceVariantsArgs, args)
    const cursor = await this.itemService.variantsByIds(parent.variantIds, filter)
    return this.transform.entityToPaginated(Variant, VariantsConnection, cursor, parsedArgs)
  }
}

@Resolver(() => ItemReuse)
export class ItemReuseResolver {
  constructor(
    private readonly itemService: ItemService,
    private readonly transform: TransformService,
  ) {}

  @ResolveField(() => ComponentsConnection)
  async components(
    @Parent() parent: ItemReuse,
    @Args() args: ItemReuseComponentsArgs,
  ): Promise<ComponentsConnection> {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ItemReuseComponentsArgs, args)
    const cursor = await this.itemService.componentsByIds(parent.componentIds, filter)
    return this.transform.entityToPaginated(Component, ComponentsConnection, cursor, parsedArgs)
  }

  @ResolveField(() => VariantsConnection)
  async variants(
    @Parent() parent: ItemReuse,
    @Args() args: ItemReuseVariantsArgs,
  ): Promise<VariantsConnection> {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ItemReuseVariantsArgs, args)
    const cursor = await this.itemService.variantsByIds(parent.variantIds, filter)
    return this.transform.entityToPaginated(Variant, VariantsConnection, cursor, parsedArgs)
  }
}

@Resolver(() => ItemHistory)
export class ItemHistoryResolver {
  constructor(
    private readonly transform: TransformService,
    private readonly editService: EditService,
  ) {}

  @ResolveField('user', () => User)
  async user(@Parent() history: ItemHistory) {
    if (history.user instanceof User) {
      return history.user
    }
    if (Reference.isReference(history.user)) {
      history.user = await history.user.loadOrFail()
    }
    return this.transform.entityToModel(User, history.user)
  }

  @ResolveField('original', () => Item, { nullable: true })
  async historyOriginal(@Parent() history: ItemHistory) {
    const original = history.original
    if (!original) {
      return null
    }
    const entity = await this.editService.changePOJOToEntity(ItemEntity, original)
    return this.transform.entityToModel(Item, entity)
  }

  @ResolveField('changes', () => Item, { nullable: true })
  async historyChanges(@Parent() history: ItemHistory) {
    const changes = history.changes
    if (!changes) {
      return null
    }
    const entity = await this.editService.changePOJOToEntity(ItemEntity, changes)
    return this.transform.entityToModel(Item, entity)
  }
}
