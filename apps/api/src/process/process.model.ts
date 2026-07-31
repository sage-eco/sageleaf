import { ArgsType, Field, ID, InputType, ObjectType } from '@nestjs/graphql'
import { IsEnum, IsOptional } from 'class-validator'
import { JSONObjectResolver } from 'graphql-scalars'
import { DateTime } from 'luxon'
import { z } from 'zod/v4'

import { ChangeInputWithLang } from '@src/changes/change-ext.model'
import { Change } from '@src/changes/change.model'
import { Source } from '@src/changes/source.model'
import { LuxonDateTimeResolver } from '@src/common/datetime.model'
import { type JSONObject } from '@src/common/z.schema'
import { Place } from '@src/geo/place.model'
import { Region } from '@src/geo/region.model'
import {
  BaseModel,
  IDCreatedUpdated,
  type ModelRef,
  registerModel,
  TranslatedInput,
} from '@src/graphql/base.model'
import { Named } from '@src/graphql/interfaces.model'
import { OrderDirection, Paginated, PaginationBasicArgs } from '@src/graphql/paginated'
import { Material } from '@src/process/material.model'
import { ProcessIntent } from '@src/process/process.entity'
import { Variant } from '@src/product/variant.model'
import { Org } from '@src/users/org.model'
import { User as UserEntity } from '@src/users/users.entity'
import { User } from '@src/users/users.model'

@ObjectType({ description: 'Efficiency metrics for a recycling or recovery process' })
export class ProcessEfficiency {
  @Field(() => Number, {
    nullable: true,
    description: 'Recycling or recovery efficiency ratio (0–1)',
  })
  efficiency?: number

  @Field(() => Number, {
    nullable: true,
    description: 'Material equivalency ratio for this process',
  })
  equivalency?: number

  @Field(() => Number, {
    nullable: true,
    description: 'Value recovery ratio relative to virgin material',
  })
  valueRatio?: number
}

@ObjectType({
  implements: () => [Named],
  description: 'A recycling, reuse, or disposal process for a product variant or material',
})
export class Process extends IDCreatedUpdated implements Named {
  @Field(() => String, {
    description: 'The type of circular economy process (e.g. RECYCLE, REUSE, REPAIR)',
  })
  intent!: ProcessIntent

  @Field(() => String, { nullable: true })
  name?: string

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => ProcessEfficiency, {
    nullable: true,
    description: 'Efficiency metrics for this process',
  })
  efficiency?: ProcessEfficiency

  @Field(() => Material, { nullable: true, description: 'The material this process handles' })
  material?: Material & {}

  @Field(() => Variant, {
    nullable: true,
    description: 'The product variant this process applies to',
  })
  variant?: Variant & {}

  @Field(() => Org, {
    nullable: true,
    description: 'The organization that offers or operates this process',
  })
  org?: Org & {}

  @Field(() => Region, {
    nullable: true,
    description: 'The geographic region where this process is available',
  })
  region?: Region & {}

  @Field(() => Place, {
    nullable: true,
    description: 'The physical location where this process is carried out',
  })
  place?: Place & {}

  @Field(() => ProcessSourcesConnection)
  sources!: ProcessSourcesConnection & {}

  @Field(() => ProcessHistoryConnection, {
    description: 'Audit history of changes to this process',
  })
  history!: ProcessHistoryConnection & {}
}
registerModel('Process', Process)

@ObjectType()
export class ProcessHistory extends BaseModel {
  @Field(() => Process)
  process!: Process

  @Field(() => LuxonDateTimeResolver)
  datetime!: DateTime

  @Field(() => User)
  user!: ModelRef<User, UserEntity>

  @Field(() => Process, { nullable: true })
  original?: Process

  @Field(() => Process, { nullable: true })
  changes?: Process
}

@ObjectType()
export class ProcessSource extends BaseModel {
  @Field(() => Source)
  source!: Source & {}

  @Field(() => JSONObjectResolver, { nullable: true })
  meta?: JSONObject
}

@ObjectType()
export class ProcessSourcesConnection extends Paginated(ProcessSource) {}

@ObjectType()
export class ProcessHistoryConnection extends Paginated(ProcessHistory) {}

@ObjectType()
export class ProcessConnection extends Paginated(Process) {}

@ArgsType()
export class ProcessHistoryArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema

  // ProcessHistory's primary key is (process, datetime) — there's no `id`.
  orderBy(): string[] {
    return ['datetime']
  }
}

@ArgsType()
export class ProcessSourcesArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema

  orderBy(): string[] {
    return ['source']
  }
}

@ArgsType()
export class ProcessArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema.extend({
    region: z.string().optional(),
    material: z.nanoid().optional(),
  })

  @Field(() => ID, { nullable: true })
  region?: string

  @Field(() => ID, { nullable: true })
  material?: string

  orderBy(): string[] {
    return ['relevance']
  }

  orderDir(): OrderDirection[] {
    return [OrderDirection.DESC]
  }
}

@InputType()
export class ProcessMaterialInput {
  @Field(() => ID)
  id!: string
}

@InputType()
export class ProcessVariantInput {
  @Field(() => ID)
  id!: string
}

@InputType()
export class ProcessOrgInput {
  @Field(() => ID)
  id!: string
}

@InputType()
export class ProcessRegionInput {
  @Field(() => ID)
  id!: string
}

@InputType()
export class ProcessPlaceInput {
  @Field(() => ID)
  id!: string
}

@InputType()
export class CreateProcessInput extends ChangeInputWithLang {
  @Field(() => String)
  @IsEnum(ProcessIntent, { message: 'Invalid process intent' })
  intent!: ProcessIntent

  @Field(() => String, { nullable: true })
  name?: string

  @Field(() => [TranslatedInput], { nullable: true })
  nameTr?: TranslatedInput[]

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => [TranslatedInput], { nullable: true })
  descTr?: TranslatedInput[]

  @Field(() => JSONObjectResolver, { nullable: true })
  instructions?: JSONObject

  @Field(() => JSONObjectResolver, { nullable: true })
  efficiency?: JSONObject

  @Field(() => JSONObjectResolver, { nullable: true })
  rules?: JSONObject

  @Field(() => ProcessMaterialInput, { nullable: true })
  material?: ProcessMaterialInput

  @Field(() => ProcessVariantInput, { nullable: true })
  variant?: ProcessVariantInput

  @Field(() => ProcessOrgInput, { nullable: true })
  org?: ProcessOrgInput

  @Field(() => ProcessRegionInput, { nullable: true })
  region?: ProcessRegionInput

  @Field(() => ProcessPlaceInput, { nullable: true })
  place?: ProcessPlaceInput
}

@InputType()
export class UpdateProcessInput extends ChangeInputWithLang {
  @Field(() => ID)
  id!: string

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsEnum(ProcessIntent, { message: 'Invalid process intent' })
  intent?: ProcessIntent

  @Field(() => String, { nullable: true })
  name?: string

  @Field(() => [TranslatedInput], { nullable: true })
  nameTr?: TranslatedInput[]

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => [TranslatedInput], { nullable: true })
  descTr?: TranslatedInput[]

  @Field(() => JSONObjectResolver, { nullable: true })
  instructions?: JSONObject

  @Field(() => JSONObjectResolver, { nullable: true })
  efficiency?: JSONObject

  @Field(() => JSONObjectResolver, { nullable: true })
  rules?: JSONObject

  @Field(() => ProcessMaterialInput, { nullable: true })
  material?: ProcessMaterialInput

  @Field(() => ProcessVariantInput, { nullable: true })
  variant?: ProcessVariantInput

  @Field(() => ProcessOrgInput, { nullable: true })
  org?: ProcessOrgInput

  @Field(() => ProcessRegionInput, { nullable: true })
  region?: ProcessRegionInput

  @Field(() => ProcessPlaceInput, { nullable: true })
  place?: ProcessPlaceInput
}

@ObjectType()
export class CreateProcessOutput {
  @Field(() => Change, { nullable: true })
  change?: Change & {}

  @Field(() => Process, { nullable: true })
  process?: Process
}

@ObjectType()
export class UpdateProcessOutput {
  @Field(() => Change, {
    nullable: true,
    description: 'The change tracking record, if the update was submitted via a change',
  })
  change?: Change & {}

  @Field(() => Process, {
    nullable: true,
    description: 'The process including the proposed changes',
  })
  process?: Process

  @Field(() => Process, {
    nullable: true,
    description:
      'The process as currently persisted in the database, before any pending change is merged',
  })
  currentProcess?: Process & {}
}
