import { ArgsType, Field, ID, InputType, ObjectType } from '@nestjs/graphql'
import { IsLatitude, IsLongitude, IsNumber, IsOptional, MaxLength, Validate } from 'class-validator'
import { JSONObjectResolver } from 'graphql-scalars'
import { DateTime } from 'luxon'
import { z } from 'zod/v4'

import { ChangeInputWithLang } from '@src/changes/change-ext.model'
import { Change } from '@src/changes/change.model'
import { LuxonDateTimeResolver } from '@src/common/datetime.model'
import { IsNanoID } from '@src/common/validator.model'
import { type JSONObject } from '@src/common/z.schema'
import { CreatedUpdated, registerModel, TranslatedInput } from '@src/graphql/base.model'
import { Named } from '@src/graphql/interfaces.model'
import { OrderDirection, Paginated, PaginationBasicArgs } from '@src/graphql/paginated'
import { TagConnection } from '@src/process/tag.model'
import { Org } from '@src/users/org.model'

@ObjectType({ description: 'Geographic coordinates (latitude and longitude) for a place' })
export class PlaceLocation {
  @Field(() => Number)
  @IsNumber()
  @IsLatitude()
  latitude!: number

  @Field(() => Number)
  @IsNumber()
  @IsLongitude()
  longitude!: number
}

@ObjectType({ description: 'A structured postal address' })
export class PlaceAddress {
  @Field(() => String, { nullable: true })
  housenumber?: string

  @Field(() => String, { nullable: true })
  street?: string

  @Field(() => String, { nullable: true })
  city?: string

  @Field(() => String, { nullable: true })
  region?: string

  @Field(() => String, { nullable: true })
  postcode?: string

  @Field(() => String, { nullable: true })
  country?: string
}

@ObjectType({
  implements: () => [Named],
  description: 'A specific physical location, such as a business or recycling facility',
})
export class Place extends CreatedUpdated implements Named {
  @Field(() => ID)
  id!: string

  @Field(() => String, { nullable: true })
  name?: string

  @Field(() => PlaceAddress, {
    nullable: true,
    description: 'Structured postal address of this place',
  })
  address?: PlaceAddress

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => PlaceLocation, {
    nullable: true,
    description: 'Geographic coordinates of this place',
  })
  location?: PlaceLocation

  @Field(() => TagConnection, { description: 'Metadata tags applied to this place' })
  tags!: TagConnection

  @Field(() => Org, { nullable: true, description: 'The organization associated with this place' })
  org?: Org & {}

  @Field(() => PlacesConnection, { description: 'Similar places related to this place' })
  related!: PlacesConnection & {}
}
registerModel('Place', Place)

@ObjectType()
export class PlaceHistory {
  @Field(() => String)
  place_id!: string

  @Field(() => LuxonDateTimeResolver)
  datetime!: DateTime

  @Field(() => String)
  userID!: string

  @Field(() => String, { nullable: true })
  original?: string

  @Field(() => String, { nullable: true })
  changes?: string
}

@ObjectType()
export class PlacesConnection extends Paginated(Place) {}

@ArgsType()
export class PlaceTagsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class PlacesArgs extends PaginationBasicArgs {
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

@InputType()
export class PlaceTagsInput {
  @Field(() => ID)
  @Validate(IsNanoID)
  id!: string

  @Field(() => JSONObjectResolver, { nullable: true })
  @IsOptional()
  meta?: JSONObject
}

@InputType()
export class PlaceOrgInput {
  @Field(() => ID)
  @Validate(IsNanoID)
  id!: string
}

@InputType()
export class PlaceLocationInput {
  @Field(() => Number)
  @IsNumber()
  @IsLatitude()
  latitude!: number

  @Field(() => Number)
  @IsNumber()
  @IsLongitude()
  longitude!: number
}

@InputType()
export class CreatePlaceInput extends ChangeInputWithLang {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(1024)
  name?: string

  @Field(() => [TranslatedInput], { nullable: true })
  @IsOptional()
  nameTr?: TranslatedInput[]

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(100_000)
  desc?: string

  @Field(() => [TranslatedInput], { nullable: true })
  @IsOptional()
  descTr?: TranslatedInput[]

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(2048)
  address?: string

  @Field(() => [TranslatedInput], { nullable: true })
  @IsOptional()
  addressTr?: TranslatedInput[]

  @Field(() => PlaceLocationInput, { nullable: true })
  @IsOptional()
  location?: PlaceLocationInput

  @Field(() => PlaceOrgInput, { nullable: true })
  @IsOptional()
  org?: PlaceOrgInput

  @Field(() => [PlaceTagsInput], { nullable: true })
  @IsOptional()
  tags?: PlaceTagsInput[]
}

@InputType()
export class UpdatePlaceInput extends ChangeInputWithLang {
  @Field(() => ID)
  @Validate(IsNanoID)
  id!: string

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(1024)
  name?: string

  @Field(() => [TranslatedInput], { nullable: true })
  @IsOptional()
  nameTr?: TranslatedInput[]

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(100_000)
  desc?: string

  @Field(() => [TranslatedInput], { nullable: true })
  @IsOptional()
  descTr?: TranslatedInput[]

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(2048)
  address?: string

  @Field(() => [TranslatedInput], { nullable: true })
  @IsOptional()
  addressTr?: TranslatedInput[]

  @Field(() => PlaceLocationInput, { nullable: true })
  @IsOptional()
  location?: PlaceLocationInput

  @Field(() => PlaceOrgInput, { nullable: true })
  @IsOptional()
  org?: PlaceOrgInput

  @Field(() => [PlaceTagsInput], { nullable: true })
  @IsOptional()
  tags?: PlaceTagsInput[]

  @Field(() => [PlaceTagsInput], { nullable: true })
  @IsOptional()
  addTags?: PlaceTagsInput[]

  @Field(() => [ID], { nullable: true })
  @IsOptional()
  removeTags?: string[]
}

@ObjectType()
export class CreatePlaceOutput {
  @Field(() => Change, { nullable: true })
  change?: Change & {}

  @Field(() => Place, { nullable: true })
  place?: Place & {}
}

@ObjectType()
export class UpdatePlaceOutput {
  @Field(() => Change, { nullable: true })
  change?: Change & {}

  @Field(() => Place, { nullable: true })
  place?: Place & {}

  @Field(() => Place, {
    nullable: true,
    description:
      'The place as currently persisted in the database, before any pending change is merged',
  })
  currentPlace?: Place & {}
}
