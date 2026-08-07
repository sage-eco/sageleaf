import { ArgsType, Field, Float, ID, InputType, ObjectType } from '@nestjs/graphql'
import { IsOptional, MaxLength } from 'class-validator'
import { JSONObjectResolver } from 'graphql-scalars'
import { DateTime } from 'luxon'
import { z } from 'zod/v4'

import { ChangeInputWithLang } from '@src/changes/change-ext.model'
import { Change } from '@src/changes/change.model'
import { Source } from '@src/changes/source.model'
import { LuxonDateTimeResolver } from '@src/common/datetime.model'
import { type JSONObject } from '@src/common/z.schema'
import { Region } from '@src/geo/region.model'
import {
  BaseModel,
  IDCreatedUpdated,
  type ModelRef,
  registerModel,
  TranslatedInput,
} from '@src/graphql/base.model'
import { Named } from '@src/graphql/interfaces.model'
import { Node } from '@src/graphql/node.model'
import { OrderDirection, Paginated, PaginationBasicArgs } from '@src/graphql/paginated'
import { type ComponentPhysical, type ComponentVisual } from '@src/process/component.entity'
import { Material } from '@src/process/material.model'
import {
  ComponentRecycle,
  ComponentReduce,
  ComponentReuse,
  StreamScore,
} from '@src/process/stream.model'
import { TagConnection } from '@src/process/tag.model'
import { ImagesConnection } from '@src/product/image.model'
import { VariantsConnection } from '@src/product/variant.model'
import { User as UserEntity } from '@src/users/users.entity'
import { User } from '@src/users/users.model'

@ObjectType({ description: 'The fraction of a specific material within a component' })
export class ComponentMaterial {
  @Field(() => Material)
  material!: Material & {}

  @Field(() => Float, {
    nullable: true,
    description: 'Fraction of this material in the component (0–1)',
  })
  materialFraction?: number
}

@ObjectType({
  implements: () => [Named, Node],
  description: 'A physical component of a product variant, made of one or more materials',
})
export class Component extends IDCreatedUpdated implements Named, Node {
  @Field(() => String, { nullable: true })
  @MaxLength(1024)
  name?: string

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => String, { nullable: true })
  imageURL?: string

  @Field(() => Material, { description: 'The primary material this component is made of' })
  primaryMaterial!: Material & {}

  @Field(() => [ComponentMaterial], {
    description: 'All materials in this component with their fractions',
  })
  materials: ComponentMaterial[] = []

  @Field(() => TagConnection)
  tags!: TagConnection & {}

  @Field(() => Region, {
    nullable: true,
    description: "The geographic region this component's recycling data applies to",
  })
  region?: Region & {}

  @Field(() => [ComponentRecycle], {
    nullable: true,
    description: 'Available recycling options for this component by stream',
  })
  recycle?: ComponentRecycle[]

  @Field(() => StreamScore, {
    nullable: true,
    description: 'Aggregated recyclability score for this component',
  })
  recycleScore?: StreamScore

  @Field(() => [ComponentReduce], {
    nullable: true,
    description: 'Available reduce options for this component by stream',
  })
  reduce?: ComponentReduce[]

  @Field(() => StreamScore, {
    nullable: true,
    description: 'Aggregated reduce score for this component',
  })
  reduceScore?: StreamScore

  @Field(() => [ComponentReuse], {
    nullable: true,
    description: 'Available reuse options for this component by stream',
  })
  reuse?: ComponentReuse[]

  @Field(() => StreamScore, {
    nullable: true,
    description: 'Aggregated reuse score for this component',
  })
  reuseScore?: StreamScore

  @Field(() => ImagesConnection, { description: 'Images associated with this component' })
  images!: ImagesConnection

  @Field(() => VariantsConnection, {
    description: 'Product variants that include this component',
  })
  variants!: VariantsConnection & {}

  @Field(() => ComponentsConnection, {
    description: 'Similar components related to this component',
  })
  related!: ComponentsConnection & {}

  @Field(() => ComponentSourcesConnection)
  sources!: ComponentSourcesConnection & {}

  @Field(() => ComponentHistoryConnection, {
    description: 'Audit history of changes to this component',
  })
  history!: ComponentHistoryConnection & {}
}
registerModel('Component', Component)

@ObjectType()
export class ComponentHistory extends BaseModel {
  @Field(() => Component)
  component!: Component

  @Field(() => LuxonDateTimeResolver)
  datetime!: DateTime

  @Field(() => User)
  user!: ModelRef<User, UserEntity>

  @Field(() => Component, { nullable: true })
  original?: Component

  @Field(() => Component, { nullable: true })
  changes?: Component
}

@ObjectType()
export class ComponentSource {
  @Field(() => Source)
  source!: Source & {}

  @Field(() => JSONObjectResolver, { nullable: true })
  meta?: JSONObject
}

@ObjectType()
export class ComponentSourcesConnection extends Paginated(ComponentSource) {}

@ObjectType()
export class ComponentHistoryConnection extends Paginated(ComponentHistory) {}

@ObjectType()
export class ComponentsConnection extends Paginated(Component) {}

@ArgsType()
export class ComponentHistoryArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class ComponentTagsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class ComponentVariantsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class ComponentSourcesArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema.extend({
    type: z.string().optional(),
  })

  @Field(() => String, { nullable: true })
  type?: string

  orderBy(): string[] {
    return ['source']
  }
}

@ArgsType()
export class ComponentsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema.extend({
    query: z.string().optional(),
  })

  @Field(() => String, { nullable: true })
  query?: string

  orderBy(): string[] {
    return ['relevance']
  }

  orderDir(): OrderDirection[] {
    return [OrderDirection.DESC]
  }
}

@ArgsType()
export class ComponentRecycleArgs {
  static schema = z.object({
    regionID: z.string().optional(),
  })

  @Field(() => ID, { nullable: true })
  @IsOptional()
  regionID?: string
}

@ArgsType()
export class ComponentReduceArgs {
  static schema = z.object({
    regionID: z.string().optional(),
  })

  @Field(() => ID, { nullable: true })
  @IsOptional()
  regionID?: string
}

@ArgsType()
export class ComponentReuseArgs {
  static schema = z.object({
    regionID: z.string().optional(),
  })

  @Field(() => ID, { nullable: true })
  @IsOptional()
  regionID?: string
}

@InputType()
export class ComponentMaterialInput {
  @Field(() => ID)
  id!: string

  @Field(() => Float, {
    nullable: true,
    description: 'Fraction of this material in the component (0–1)',
  })
  materialFraction?: number
}

@InputType()
export class ComponentTagsInput {
  @Field(() => ID)
  id!: string

  @Field(() => JSONObjectResolver, { nullable: true })
  meta?: JSONObject
}

@InputType()
export class ComponentRegionInput {
  @Field(() => ID)
  id!: string
}

@InputType()
export class CreateComponentInput extends ChangeInputWithLang {
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

  @Field(() => JSONObjectResolver, { nullable: true })
  visual?: ComponentVisual

  @Field(() => JSONObjectResolver, { nullable: true })
  physical?: ComponentPhysical

  @Field(() => ComponentMaterialInput, { nullable: true })
  primaryMaterial?: ComponentMaterialInput

  @Field(() => [ComponentMaterialInput], { nullable: true })
  materials?: ComponentMaterialInput[]

  @Field(() => [ComponentTagsInput], { nullable: true })
  tags?: ComponentTagsInput[]

  @Field(() => ComponentRegionInput, { nullable: true })
  region?: ComponentRegionInput
}

@InputType()
export class UpdateComponentInput extends ChangeInputWithLang {
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

  @Field(() => JSONObjectResolver, { nullable: true })
  visual?: Record<string, any>

  @Field(() => JSONObjectResolver, { nullable: true })
  physical?: Record<string, any>

  @Field(() => ComponentMaterialInput, { nullable: true })
  primaryMaterial?: ComponentMaterialInput

  @Field(() => [ComponentMaterialInput], { nullable: true })
  materials?: ComponentMaterialInput[]

  @Field(() => [ComponentTagsInput], { nullable: true })
  tags?: ComponentTagsInput[]

  @Field(() => [ComponentTagsInput], { nullable: true })
  addTags?: ComponentTagsInput[]

  @Field(() => [ID], { nullable: true })
  removeTags?: string[]

  @Field(() => ComponentRegionInput, { nullable: true })
  region?: ComponentRegionInput
}

@ObjectType()
export class CreateComponentOutput {
  @Field(() => Change, { nullable: true })
  change?: Change & {}

  @Field(() => Component, { nullable: true })
  component?: Component
}

@ObjectType()
export class UpdateComponentOutput {
  @Field(() => Change, {
    nullable: true,
    description: 'The change tracking record, if the update was submitted via a change',
  })
  change?: Change & {}

  @Field(() => Component, {
    nullable: true,
    description: 'The component including the proposed changes',
  })
  component?: Component

  @Field(() => Component, {
    nullable: true,
    description:
      'The component as currently persisted in the database, before any pending change is merged',
  })
  currentComponent?: Component & {}
}
