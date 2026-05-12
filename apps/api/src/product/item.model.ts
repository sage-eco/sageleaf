import { ArgsType, Field, ID, InputType, ObjectType } from '@nestjs/graphql'
import { IsOptional, MaxLength } from 'class-validator'
import { JSONObjectResolver } from 'graphql-scalars'
import { DateTime } from 'luxon'
import { z } from 'zod/v4'

import { ChangeInputWithLang } from '@src/changes/change-ext.model'
import { Change } from '@src/changes/change.model'
import { LuxonDateTimeResolver } from '@src/common/datetime.model'
import { type JSONObject } from '@src/common/z.schema'
import {
  BaseModel,
  IDCreatedUpdated,
  type ModelRef,
  registerModel,
  TranslatedInput,
} from '@src/graphql/base.model'
import { Named } from '@src/graphql/interfaces.model'
import { Paginated, PaginationBasicArgs } from '@src/graphql/paginated'
import { ComponentsConnection } from '@src/process/component.model'
import { RecyclingStream, StreamContext, StreamScore } from '@src/process/stream.model'
import { TagConnection } from '@src/process/tag.model'
import { CategoriesConnection } from '@src/product/category.model'
import { VariantsConnection } from '@src/product/variant.model'
import { User as UserEntity } from '@src/users/users.entity'
import { User } from '@src/users/users.model'

@ObjectType({ description: 'Recycling options for an item in a specific recycling stream' })
export class ItemRecycle {
  @Field(() => RecyclingStream, { nullable: true })
  stream?: RecyclingStream

  @Field(() => [StreamContext])
  context: StreamContext[] = []

  @Field(() => ComponentsConnection)
  components!: ComponentsConnection & {}

  @Field(() => VariantsConnection)
  variants!: VariantsConnection & {}

  itemId!: string
  regionID?: string
  componentIds: string[] = []
  variantIds: string[] = []
}

@ObjectType({
  implements: () => [Named],
  description: 'A product or consumable item that can be categorized and have multiple variants',
})
export class Item extends IDCreatedUpdated implements Named {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(1024)
  name?: string

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => String, { nullable: true })
  @IsOptional()
  imageURL?: string

  @Field(() => CategoriesConnection, { description: 'Categories this item belongs to' })
  categories!: CategoriesConnection

  @Field(() => TagConnection, { description: 'Metadata tags applied to this item' })
  tags!: TagConnection

  @Field(() => VariantsConnection, {
    description: 'Product variants of this item (e.g. specific SKUs or models)',
  })
  variants!: VariantsConnection & {}

  @Field(() => StreamScore, {
    nullable: true,
    description: 'Recyclability score for this item',
  })
  recycleScore?: StreamScore

  @Field(() => [ItemRecycle], {
    description: 'Recycling options for this item, one entry per recycling stream',
  })
  recycle!: ItemRecycle[]

  @Field(() => ItemsConnection, { description: 'Similar items related to this item' })
  related!: ItemsConnection & {}

  @Field(() => ItemHistoryConnection, { description: 'Audit history of changes to this item' })
  history!: ItemHistoryConnection & {}
}
registerModel('Item', Item)

@ObjectType()
export class ItemHistory extends BaseModel {
  @Field(() => Item)
  item!: Item

  @Field(() => LuxonDateTimeResolver)
  datetime!: DateTime

  @Field(() => User)
  user!: ModelRef<User, UserEntity>

  @Field(() => Item, { nullable: true })
  original?: Item

  @Field(() => Item, { nullable: true })
  changes?: Item
}

@ObjectType()
export class ItemHistoryConnection extends Paginated(ItemHistory) {}

@ObjectType()
export class ItemsConnection extends Paginated(Item) {}

@ArgsType()
export class ItemHistoryArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class ItemsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class ItemCategoriesArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class ItemTagsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class ItemVariantsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class ItemRecycleArgs {
  static schema = z.object({
    regionID: z.string().optional(),
  })

  @Field(() => ID, { nullable: true })
  @IsOptional()
  regionID?: string
}

@ArgsType()
export class ItemRecycleComponentsArgs extends PaginationBasicArgs {}

@ArgsType()
export class ItemRecycleVariantsArgs extends PaginationBasicArgs {}

@InputType()
export class ItemCategoriesInput {
  @Field(() => ID)
  id!: string
}

@InputType()
export class ItemTagsInput {
  @Field(() => ID)
  id!: string

  @Field(() => JSONObjectResolver, { nullable: true })
  meta?: JSONObject
}

@InputType()
export class CreateItemInput extends ChangeInputWithLang {
  @Field(() => String, { nullable: true })
  name?: string

  @Field(() => [TranslatedInput], { nullable: true })
  nameTr?: TranslatedInput[]

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => [TranslatedInput], { nullable: true })
  descTr?: TranslatedInput[]

  @Field(() => String, { nullable: true })
  imageURL?: string

  @Field(() => [ItemCategoriesInput], { nullable: true })
  categories?: ItemCategoriesInput[]

  @Field(() => [ItemTagsInput], { nullable: true })
  tags?: ItemTagsInput[]
}

@InputType()
export class UpdateItemInput extends ChangeInputWithLang {
  @Field(() => ID)
  id!: string

  @Field(() => String, { nullable: true })
  name?: string

  @Field(() => [TranslatedInput], { nullable: true })
  nameTr?: TranslatedInput[]

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => [TranslatedInput], { nullable: true })
  descTr?: TranslatedInput[]

  @Field(() => String, { nullable: true })
  imageURL?: string

  @Field(() => [ItemCategoriesInput], { nullable: true })
  categories?: ItemCategoriesInput[]

  @Field(() => [ItemCategoriesInput], { nullable: true })
  addCategories?: ItemCategoriesInput[]

  @Field(() => [ID], { nullable: true })
  removeCategories?: string[]

  @Field(() => [ItemTagsInput], { nullable: true })
  tags?: ItemTagsInput[]

  @Field(() => [ItemTagsInput], { nullable: true })
  addTags?: ItemTagsInput[]

  @Field(() => [ID], { nullable: true })
  removeTags?: string[]
}

@ObjectType()
export class CreateItemOutput {
  @Field(() => Change, { nullable: true })
  change?: Change & {}

  @Field(() => Item, { nullable: true })
  item?: Item
}

@ObjectType()
export class UpdateItemOutput {
  @Field(() => Change, {
    nullable: true,
    description: 'The change tracking record, if the update was submitted via a change',
  })
  change?: Change & {}

  @Field(() => Item, {
    nullable: true,
    description: 'The item including the proposed changes',
  })
  item?: Item

  @Field(() => Item, {
    nullable: true,
    description:
      'The item as currently persisted in the database, before any pending change is merged',
  })
  currentItem?: Item & {}
}
