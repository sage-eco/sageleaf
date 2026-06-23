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
import { Category as CategoryEntity } from '@src/product/category.entity'
import {
  CategoriesArgs,
  CategoriesConnection,
  Category,
  CategoryHistory,
  CategoryHistoryArgs,
  CategoryHistoryConnection,
  CategoryItemsArgs,
  CreateCategoryInput,
  CreateCategoryOutput,
  UpdateCategoryInput,
  UpdateCategoryOutput,
} from '@src/product/category.model'
import { CategorySchemaService } from '@src/product/category.schema'
import { CategoryService } from '@src/product/category.service'
import { Item, ItemsConnection } from '@src/product/item.model'
import { RelatedArgs } from '@src/search/related.model'
import { SearchIndex } from '@src/search/search.backend'
import { SearchService } from '@src/search/search.service'
import { User } from '@src/users/users.model'

@Resolver(() => Category)
export class CategoryResolver {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly categorySchemaService: CategorySchemaService,
    private readonly transform: TransformService,
    private readonly searchService: SearchService,
  ) {}

  @Query(() => CategoriesConnection, { name: 'categories' })
  @OptionalAuth()
  async categories(@Args() args: CategoriesArgs): Promise<CategoriesConnection> {
    const [parsedArgs, filter] = await this.transform.paginationArgs(CategoriesArgs, args)
    const cursor = await this.categoryService.find(filter)
    return this.transform.entityToPaginated(Category, CategoriesConnection, cursor, parsedArgs)
  }

  @Query(() => Category, { name: 'category', nullable: true })
  @OptionalAuth()
  @TrackEntityView('category')
  async category(@Args('id', { type: () => ID }) id: string): Promise<Category> {
    const category = await this.categoryService.findOneByID(id)
    if (!category) {
      throw NotFoundErr('Category not found')
    }
    const model = await this.transform.entityToModel(Category, category)
    return model
  }

  @Query(() => Category, { name: 'categoryRoot' })
  @OptionalAuth()
  async categoryRoot(): Promise<Category> {
    const category = await this.categoryService.findRoot()
    if (!category) {
      throw NotFoundErr('Root category not found')
    }
    const model = await this.transform.entityToModel(Category, category)
    return model
  }

  @Query(() => ModelEditSchema, { nullable: true })
  @OptionalAuth()
  async categorySchema(): Promise<ModelEditSchema> {
    return {
      model: 'Category',
      create: {
        schema: this.categorySchemaService.CreateJSONSchema,
        uischema: this.categorySchemaService.CreateUISchema,
      },
      update: {
        schema: this.categorySchemaService.UpdateJSONSchema,
        uischema: this.categorySchemaService.UpdateUISchema,
      },
    }
  }

  @ResolveField()
  async parents(@Parent() category: Category, @Args() args: CategoriesArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(CategoriesArgs, args)
    const cursor = await this.categoryService.findParents(category.id, filter)
    return this.transform.entityToPaginated(Category, CategoriesConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async children(@Parent() category: Category, @Args() args: CategoriesArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(CategoriesArgs, args)
    const cursor = await this.categoryService.findChildren(category.id, filter)
    return this.transform.entityToPaginated(Category, CategoriesConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async ancestors(@Parent() category: Category, @Args() args: CategoriesArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(CategoriesArgs, args)
    const cursor = await this.categoryService.findDirectAncestors(category.id, filter)
    return this.transform.entityToPaginated(Category, CategoriesConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async descendants(@Parent() category: Category, @Args() args: CategoriesArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(CategoriesArgs, args)
    const cursor = await this.categoryService.findDirectDescendants(category.id, filter)
    return this.transform.entityToPaginated(Category, CategoriesConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async items(@Parent() category: Category, @Args() args: CategoryItemsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(CategoryItemsArgs, args)
    const cursor = await this.categoryService.items(category.id, filter)
    return this.transform.entityToPaginated(Item, ItemsConnection, cursor, parsedArgs)
  }

  @ResolveField(() => CategoriesConnection)
  async related(@Parent() category: Category, @Args() args: RelatedArgs) {
    const parsedArgs = await this.searchService.parseRelatedArgs(args)
    const cursor = await this.searchService.searchRelated(
      SearchIndex.CATEGORIES,
      category.id,
      parsedArgs.query,
      parsedArgs.limit,
      parsedArgs.offset,
    )
    return this.transform.entitiesToOffsetPaginated(
      Category,
      CategoriesConnection,
      cursor,
      parsedArgs,
    )
  }

  @Mutation(() => CreateCategoryOutput, {
    name: 'createCategory',
    nullable: true,
  })
  async createCategory(
    @Args('input') input: CreateCategoryInput,
    @AuthUser() user: ReqUser,
  ): Promise<CreateCategoryOutput> {
    input = await this.categorySchemaService.parseCreateInput(input)
    const created = await this.categoryService.create(input, user.id)
    const model = await this.transform.entityToModel(Category, created.category)
    if (!created.change) {
      return { category: model }
    }
    const change = await this.transform.entityToModel(Change, created.change)
    return { category: model, change }
  }

  @Mutation(() => UpdateCategoryOutput, {
    name: 'updateCategory',
    nullable: true,
  })
  async updateCategory(
    @Args('input') input: UpdateCategoryInput,
    @AuthUser() user: ReqUser,
  ): Promise<UpdateCategoryOutput> {
    input = await this.categorySchemaService.parseUpdateInput(input)
    const updated = await this.categoryService.update(input, user.id)
    const model = await this.transform.entityToModel(Category, updated.category)
    if (!updated.change) {
      return { category: model }
    }
    const change = await this.transform.entityToModel(Change, updated.change)
    const currentCategory = updated.currentCategory
      ? await this.transform.entityToModel(Category, updated.currentCategory)
      : undefined
    return { category: model, change, currentCategory }
  }

  @Mutation(() => DeleteOutput, { name: 'deleteCategory', nullable: true })
  async deleteCategory(@Args('input') input: DeleteInput): Promise<DeleteOutput> {
    input = await this.categorySchemaService.parseDeleteInput(input)
    const deleted = await this.categoryService.delete(input)
    if (!deleted) {
      throw NotFoundErr('Category not found')
    }
    return { success: true, id: deleted.id }
  }

  @ResolveField(() => CategoryHistoryConnection)
  async history(@Parent() category: Category, @Args() args: CategoryHistoryArgs) {
    const [, filter] = await this.transform.paginationArgs(CategoryHistoryArgs, args)
    const cursor = await this.categoryService.history(category.id, filter)
    const items = await Promise.all(
      cursor.items.map((h) => this.transform.entityToModel(CategoryHistory, h)),
    )
    return this.transform.objectsToPaginated(
      CategoryHistoryConnection,
      { items, count: cursor.count },
      true,
    )
  }
}

@Resolver(() => CategoryHistory)
export class CategoryHistoryResolver {
  constructor(
    private readonly transform: TransformService,
    private readonly editService: EditService,
  ) {}

  @ResolveField('user', () => User)
  async user(@Parent() history: CategoryHistory) {
    if (history.user instanceof User) {
      return history.user
    }
    if (Reference.isReference(history.user)) {
      history.user = await history.user.loadOrFail()
    }
    return this.transform.entityToModel(User, history.user)
  }

  @ResolveField('original', () => Category, { nullable: true })
  async historyOriginal(@Parent() history: CategoryHistory) {
    const original = history.original
    if (!original) {
      return null
    }
    const entity = await this.editService.changePOJOToEntity(CategoryEntity, original)
    return this.transform.entityToModel(Category, entity)
  }

  @ResolveField('changes', () => Category, { nullable: true })
  async historyChanges(@Parent() history: CategoryHistory) {
    const changes = history.changes
    if (!changes) {
      return null
    }
    const entity = await this.editService.changePOJOToEntity(CategoryEntity, changes)
    return this.transform.entityToModel(Category, entity)
  }
}
