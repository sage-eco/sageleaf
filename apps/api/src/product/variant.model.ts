import { ArgsType, Field, ID, InputType, ObjectType } from '@nestjs/graphql'
import { IsOptional, IsUrl, MaxLength, Validate } from 'class-validator'
import { JSONObjectResolver } from 'graphql-scalars'
import { DateTime } from 'luxon'
import { z } from 'zod'

import { ChangeInputWithLang } from '@src/changes/change-ext.model'
import { Change } from '@src/changes/change.model'
import { Source } from '@src/changes/source.model'
import { LuxonDateTimeResolver } from '@src/common/datetime.model'
import { IsNanoID } from '@src/common/validator.model'
import { type JSONObject } from '@src/common/z.schema'
import { RegionsConnection } from '@src/geo/region.model'
import {
  BaseModel,
  IDCreatedUpdated,
  type ModelRef,
  registerModel,
  TranslatedInput,
} from '@src/graphql/base.model'
import { Named } from '@src/graphql/interfaces.model'
import { OrderDirection, Paginated, PaginationBasicArgs } from '@src/graphql/paginated'
import { Component, ComponentsConnection } from '@src/process/component.model'
import { ProcessConnection } from '@src/process/process.model'
import {
  RecyclingStream,
  ReduceStream,
  ReuseStream,
  StreamContext,
  StreamScore,
} from '@src/process/stream.model'
import { TagConnection } from '@src/process/tag.model'
import { ImagesConnection } from '@src/product/image.model'
import { ItemsConnection } from '@src/product/item.model'
import { VariantComponentUnitSchema } from '@src/product/variant.entity'
import { Org } from '@src/users/org.model'
import { User as UserEntity } from '@src/users/users.entity'
import { User } from '@src/users/users.model'

@ObjectType({ description: 'Recycling options for a variant in a specific recycling stream' })
export class VariantRecycle {
  @Field(() => RecyclingStream, { nullable: true })
  stream?: RecyclingStream

  @Field(() => [StreamContext])
  context: StreamContext[] = []

  @Field(() => ComponentsConnection)
  components!: ComponentsConnection & {}

  variantId!: string
  regionID?: string
  componentIds: string[] = []
}

@ObjectType({ description: 'Reduce options for a variant' })
export class VariantReduce {
  @Field(() => ReduceStream, { nullable: true })
  stream?: ReduceStream & {}

  @Field(() => [StreamContext])
  context: StreamContext[] = []

  @Field(() => ComponentsConnection)
  components!: ComponentsConnection & {}

  variantId!: string
  regionID?: string
  componentIds: string[] = []
}

@ObjectType({ description: 'Reuse options for a variant' })
export class VariantReuse {
  @Field(() => ReuseStream, { nullable: true })
  stream?: ReuseStream & {}

  @Field(() => [StreamContext])
  context: StreamContext[] = []

  @Field(() => ComponentsConnection)
  components!: ComponentsConnection & {}

  variantId!: string
  regionID?: string
  componentIds: string[] = []
}

@ObjectType({
  implements: () => [Named],
  description: 'A specific variant or SKU of a product item, composed of physical components',
})
export class Variant extends IDCreatedUpdated implements Named {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(1024)
  name?: string

  @Field(() => String, { nullable: true })
  @IsOptional()
  desc?: string

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsUrl({ protocols: ['https'] })
  imageURL?: string

  @Field(() => ImagesConnection, { description: 'Images associated with this variant' })
  images!: ImagesConnection

  @Field(() => ItemsConnection, { description: 'Product items this variant belongs to' })
  items!: ItemsConnection

  @Field(() => ProcessConnection, {
    description: 'Recycling or disposal processes specific to this variant',
  })
  processes!: ProcessConnection & {}

  @Field(() => VariantsConnection, { description: 'Similar variants related to this variant' })
  related!: VariantsConnection & {}

  @Field(() => VariantOrgsConnection, {
    description: 'Organizations associated with this variant (e.g. manufacturer, importer)',
  })
  orgs!: VariantOrgsConnection & {}

  @Field(() => TagConnection, { description: 'Metadata tags applied to this variant' })
  tags!: TagConnection

  @Field(() => StreamScore, {
    nullable: true,
    description: 'Aggregated recyclability score for this variant',
  })
  recycleScore?: StreamScore

  @Field(() => [VariantRecycle], {
    description: 'Recycling options for this variant, one entry per recycling stream',
  })
  recycle!: VariantRecycle[]

  @Field(() => StreamScore, {
    nullable: true,
    description: 'Aggregated reduce score for this variant',
  })
  reduceScore?: StreamScore

  @Field(() => [VariantReduce], {
    description: 'Reduce options for this variant, one entry per reduce stream',
  })
  reduce!: VariantReduce[]

  @Field(() => StreamScore, {
    nullable: true,
    description: 'Aggregated reuse score for this variant',
  })
  reuseScore?: StreamScore

  @Field(() => [VariantReuse], {
    description: 'Reuse options for this variant, one entry per reuse stream',
  })
  reuse!: VariantReuse[]

  @Field(() => RegionsConnection, {
    description: 'Geographic regions associated with this variant',
  })
  regions!: RegionsConnection & {}

  @Field(() => VariantComponentsConnection, {
    description: 'Physical components that make up this variant',
  })
  components!: VariantComponentsConnection & {}

  @Field(() => VariantSourcesConnection)
  sources!: VariantSourcesConnection & {}

  @Field(() => VariantHistoryConnection, {
    description: 'Audit history of changes to this variant',
  })
  history!: VariantHistoryConnection & {}
}
registerModel('Variant', Variant)

@ObjectType()
export class VariantHistory extends BaseModel {
  @Field(() => Variant)
  variant!: Variant

  @Field(() => LuxonDateTimeResolver)
  datetime!: DateTime

  @Field(() => User)
  user!: ModelRef<User, UserEntity>

  @Field(() => Variant, { nullable: true })
  original?: Variant

  @Field(() => Variant, { nullable: true })
  changes?: Variant
}

@ObjectType({
  description:
    'An organization associated with a variant and its role (e.g. manufacturer, importer)',
})
export class VariantOrg extends BaseModel {
  @Field(() => Org)
  org!: Org & {}

  @Field(() => String, {
    nullable: true,
    description: "The organization's role for this variant (e.g. manufacturer, importer)",
  })
  role?: string
}

@ObjectType({ description: 'A physical component within a variant, with its quantity' })
export class VariantComponent extends BaseModel {
  @Field(() => Component)
  component!: Component & {}

  @Field(() => Number, { nullable: true, description: 'Quantity of this component in the variant' })
  quantity?: number

  @Field(() => String, {
    nullable: true,
    description: 'Unit of measurement for the component quantity',
  })
  unit?: z.infer<typeof VariantComponentUnitSchema>
}

@ObjectType()
export class VariantSource extends BaseModel {
  @Field(() => Source)
  source!: Source & {}

  @Field(() => JSONObjectResolver, { nullable: true })
  meta?: JSONObject
}

@ObjectType()
export class VariantSourcesConnection extends Paginated(VariantSource) {}

@ObjectType()
export class VariantHistoryConnection extends Paginated(VariantHistory) {}

@ObjectType()
export class VariantsConnection extends Paginated(Variant) {}

@ObjectType()
export class VariantOrgsConnection extends Paginated(VariantOrg) {}

@ObjectType()
export class VariantComponentsConnection extends Paginated(VariantComponent) {}

@ArgsType()
export class VariantHistoryArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class VariantSourcesArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema

  orderBy(): string[] {
    return ['source']
  }
}

@ArgsType()
export class VariantRegionsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class VariantsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema

  orderBy(): string[] {
    return ['relevance']
  }

  orderDir(): OrderDirection[] {
    return [OrderDirection.DESC]
  }
}

@ArgsType()
export class VariantComponentsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema

  orderBy(): string[] {
    return ['component']
  }
}

@ArgsType()
export class VariantOrgsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema

  orderBy(): string[] {
    return ['org']
  }
}

@ArgsType()
export class VariantTagsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class VariantItemsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class VariantProcessesArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class VariantRecycleArgs {
  static schema = z.object({
    regionID: z.string().optional(),
  })

  @Field(() => ID, { nullable: true })
  regionID?: string
}

@ArgsType()
export class VariantRecycleComponentsArgs extends PaginationBasicArgs {}

@ArgsType()
export class VariantReduceArgs {
  static schema = z.object({
    regionID: z.string().optional(),
  })

  @Field(() => ID, { nullable: true })
  regionID?: string
}

@ArgsType()
export class VariantReduceComponentsArgs extends PaginationBasicArgs {}

@ArgsType()
export class VariantReuseArgs {
  static schema = z.object({
    regionID: z.string().optional(),
  })

  @Field(() => ID, { nullable: true })
  regionID?: string
}

@ArgsType()
export class VariantReuseComponentsArgs extends PaginationBasicArgs {}

@InputType()
export class VariantItemsInput {
  @Field(() => ID)
  id!: string
}

@InputType()
export class VariantOrgsInput {
  @Field(() => ID)
  id!: string
}

@InputType()
export class VariantTagsInput {
  @Field(() => ID)
  @Validate(IsNanoID)
  id!: string

  @Field(() => JSONObjectResolver, { nullable: true })
  meta?: JSONObject
}

@InputType()
export class VariantRegionsInput {
  @Field(() => ID)
  id!: string
}

@InputType()
export class VariantComponentsInput {
  @Field(() => ID)
  id!: string

  @Field(() => Number, { nullable: true, description: 'Quantity of this component in the variant' })
  quantity?: number

  @Field(() => String, {
    nullable: true,
    description: 'Unit of measurement for the component quantity',
  })
  unit?: z.infer<typeof VariantComponentUnitSchema>
}

@InputType()
export class CreateVariantInput extends ChangeInputWithLang {
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

  @Field(() => [VariantItemsInput], { nullable: true })
  items?: VariantItemsInput[]

  @Field(() => VariantRegionsInput, { nullable: true })
  region?: VariantRegionsInput

  @Field(() => [VariantRegionsInput], { nullable: true })
  regions?: VariantRegionsInput[]

  @Field(() => String, {
    nullable: true,
    description: 'Manufacturer or product code for this variant',
  })
  code?: string

  @Field(() => [VariantOrgsInput], { nullable: true })
  orgs?: VariantOrgsInput[]

  @Field(() => [VariantTagsInput], { nullable: true })
  tags?: VariantTagsInput[]

  @Field(() => [VariantComponentsInput], { nullable: true })
  components?: VariantComponentsInput[]
}

@InputType()
export class UpdateVariantInput extends ChangeInputWithLang {
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

  @Field(() => [VariantItemsInput], { nullable: true })
  items?: VariantItemsInput[]

  @Field(() => [VariantItemsInput], { nullable: true })
  addItems?: VariantItemsInput[]

  @Field(() => [ID], { nullable: true })
  removeItems?: string[]

  @Field(() => VariantRegionsInput, { nullable: true })
  region?: VariantRegionsInput

  @Field(() => [VariantRegionsInput], { nullable: true })
  addRegions?: VariantRegionsInput[]

  @Field(() => [ID], { nullable: true })
  removeRegions?: string[]

  @Field(() => String, { nullable: true })
  code?: string

  @Field(() => [VariantOrgsInput], { nullable: true })
  orgs?: VariantOrgsInput[]

  @Field(() => [VariantOrgsInput], { nullable: true })
  addOrgs?: VariantOrgsInput[]

  @Field(() => [ID], { nullable: true })
  removeOrgs?: string[]

  @Field(() => [VariantTagsInput], { nullable: true })
  tags?: VariantTagsInput[]

  @Field(() => [VariantTagsInput], { nullable: true })
  addTags?: VariantTagsInput[]

  @Field(() => [ID], { nullable: true })
  removeTags?: string[]

  @Field(() => [VariantComponentsInput], { nullable: true })
  components?: VariantComponentsInput[]

  @Field(() => [VariantComponentsInput], { nullable: true })
  addComponents?: VariantComponentsInput[]

  @Field(() => [ID], { nullable: true })
  removeComponents?: string[]
}

@ObjectType()
export class CreateVariantOutput {
  @Field(() => Change, {
    nullable: true,
    description: 'The change tracking record, if creation was submitted via a change',
  })
  change?: Change & {}

  @Field(() => Variant, {
    nullable: true,
    description: 'The newly created variant, reflecting the proposed state',
  })
  variant?: Variant & {}
}

@ObjectType()
export class UpdateVariantOutput {
  @Field(() => Change, {
    nullable: true,
    description: 'The change tracking record, if the update was submitted via a change',
  })
  change?: Change & {}

  @Field(() => Variant, {
    nullable: true,
    description: 'The variant including the proposed changes',
  })
  variant?: Variant & {}

  @Field(() => Variant, {
    nullable: true,
    description:
      'The variant as currently persisted in the database, before any pending change is merged',
  })
  currentVariant?: Variant & {}
}
