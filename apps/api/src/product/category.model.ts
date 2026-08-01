import { ArgsType, Field, ID, InputType, ObjectType } from '@nestjs/graphql'
import { IsOptional, MaxLength } from 'class-validator'
import { DateTime } from 'luxon'

import { ChangeInputWithLang } from '@src/changes/change-ext.model'
import { Change } from '@src/changes/change.model'
import { LuxonDateTimeResolver } from '@src/common/datetime.model'
import {
  BaseModel,
  CreatedUpdated,
  type ModelRef,
  registerModel,
  TranslatedInput,
  TranslatedOutput,
} from '@src/graphql/base.model'
import { Named } from '@src/graphql/interfaces.model'
import { OrderDirection, Paginated, PaginationBasicArgs } from '@src/graphql/paginated'
import { ItemsConnection } from '@src/product/item.model'
import { User as UserEntity } from '@src/users/users.entity'
import { User } from '@src/users/users.model'

@ObjectType({
  implements: () => [Named],
  description: 'A hierarchical category for classifying product items',
})
export class Category extends CreatedUpdated implements Named {
  @Field(() => ID)
  id!: string

  @Field(() => String)
  @MaxLength(1024)
  name!: string

  @Field(() => [TranslatedOutput], {
    nullable: true,
    description: 'Translated versions of the name',
  })
  nameTr?: TranslatedOutput[]

  @Field(() => String, { nullable: true, description: 'A short summary description' })
  @IsOptional()
  @MaxLength(1024)
  descShort?: string

  @Field(() => [TranslatedOutput], {
    nullable: true,
    description: 'Translated versions of the short description',
  })
  descShortTr?: TranslatedOutput[]

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => [TranslatedOutput], {
    nullable: true,
    description: 'Translated versions of the description',
  })
  descTr?: TranslatedOutput[]

  @Field(() => String, { nullable: true })
  @IsOptional()
  imageURL?: string

  @Field(() => CategoriesConnection, { description: 'Direct parent categories in the hierarchy' })
  parents!: CategoriesConnection & {}

  @Field(() => CategoriesConnection, { description: 'Direct child categories in the hierarchy' })
  children!: CategoriesConnection & {}

  @Field(() => CategoriesConnection, {
    description: 'All ancestor categories up the hierarchy tree',
  })
  ancestors!: CategoriesConnection & {}

  @Field(() => CategoriesConnection, {
    description: 'All descendant categories down the hierarchy tree',
  })
  descendants!: CategoriesConnection & {}

  @Field(() => ItemsConnection, { description: 'Items classified under this category' })
  items!: ItemsConnection & {}

  @Field(() => CategoriesConnection, { description: 'Similar categories related to this category' })
  related!: CategoriesConnection & {}

  @Field(() => CategoryHistoryConnection, {
    description: 'Audit history of changes to this category',
  })
  history!: CategoryHistoryConnection & {}
}
registerModel('Category', Category)

@ObjectType()
export class CategoryHistory extends BaseModel {
  @Field(() => Category)
  category!: Category

  @Field(() => LuxonDateTimeResolver)
  datetime!: DateTime

  @Field(() => User)
  user!: ModelRef<User, UserEntity>

  @Field(() => Category, { nullable: true })
  original?: Category

  @Field(() => Category, { nullable: true })
  changes?: Category
}

@ObjectType()
export class CategoryHistoryConnection extends Paginated(CategoryHistory) {}

@ObjectType()
export class CategoriesConnection extends Paginated(Category) {}

@ArgsType()
export class CategoryHistoryArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema

  // CategoryHistory's primary key is (category, datetime) — there's no `id`.
  orderBy(): string[] {
    return ['datetime']
  }
}

@ArgsType()
export class CategoriesArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema

  orderBy(): string[] {
    return ['relevance']
  }

  orderDir(): OrderDirection[] {
    return [OrderDirection.DESC]
  }
}

@ArgsType()
export class CategoryItemsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@InputType()
export class CreateCategoryInput extends ChangeInputWithLang {
  @Field(() => String, { nullable: true })
  name?: string

  @Field(() => [TranslatedInput], { nullable: true })
  nameTr?: TranslatedInput[]

  @Field(() => String, { nullable: true })
  descShort?: string

  @Field(() => [TranslatedInput], { nullable: true })
  descShortTr?: TranslatedInput[]

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => [TranslatedInput], { nullable: true })
  descTr?: TranslatedInput[]

  @Field(() => String, { nullable: true })
  imageURL?: string
}

@InputType()
export class UpdateCategoryInput extends ChangeInputWithLang {
  @Field(() => ID)
  id!: string

  @Field(() => String, { nullable: true })
  name?: string

  @Field(() => [TranslatedInput], { nullable: true })
  nameTr?: TranslatedInput[]

  @Field(() => String, { nullable: true })
  descShort?: string

  @Field(() => [TranslatedInput], { nullable: true })
  descShortTr?: TranslatedInput[]

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => [TranslatedInput], { nullable: true })
  descTr?: TranslatedInput[]

  @Field(() => String, { nullable: true })
  imageURL?: string
}

@ObjectType()
export class CreateCategoryOutput {
  @Field(() => Change, { nullable: true })
  change?: Change & {}

  @Field(() => Category, { nullable: true })
  category?: Category
}

@ObjectType()
export class UpdateCategoryOutput {
  @Field(() => Change, {
    nullable: true,
    description: 'The change tracking record, if the update was submitted via a change',
  })
  change?: Change & {}

  @Field(() => Category, {
    nullable: true,
    description: 'The category including the proposed changes',
  })
  category?: Category

  @Field(() => Category, {
    nullable: true,
    description:
      'The category as currently persisted in the database, before any pending change is merged',
  })
  currentCategory?: Category & {}
}
