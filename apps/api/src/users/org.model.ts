import { ArgsType, Field, InputType, ObjectType } from '@nestjs/graphql'
import { Validate } from 'class-validator'
import { DateTime } from 'luxon'

import { ChangeInputWithLang } from '@src/changes/change-ext.model'
import { Change } from '@src/changes/change.model'
import { LuxonDateTimeResolver } from '@src/common/datetime.model'
import { IsNanoID } from '@src/common/validator.model'
import { PlacesConnection } from '@src/geo/place.model'
import { BaseModel, IDCreatedUpdated, type ModelRef, registerModel } from '@src/graphql/base.model'
import { Named } from '@src/graphql/interfaces.model'
import { OrderDirection, Paginated, PaginationBasicArgs } from '@src/graphql/paginated'
import { ProcessConnection } from '@src/process/process.model'
import { ProgramsConnection } from '@src/process/program.model'
import { VariantsConnection } from '@src/product/variant.model'
import { User as UserEntity } from '@src/users/users.entity'
import { User, UserConnection } from '@src/users/users.model'

@ObjectType({
  implements: () => [Named],
  description: 'An organization or company on the platform',
})
export class Org extends IDCreatedUpdated implements Named {
  @Field(() => String)
  name!: string

  @Field(() => String, { description: 'URL-friendly unique identifier for this organization' })
  slug!: string

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => String, { nullable: true })
  avatarURL?: string

  @Field(() => String, { nullable: true, description: "URL of the organization's website" })
  websiteURL?: string

  @Field(() => UserConnection, { description: 'Users that are members of this organization' })
  users!: UserConnection & {}

  @Field(() => PlacesConnection, { description: 'Places belonging to this organization' })
  places!: PlacesConnection & {}

  @Field(() => ProcessConnection, { description: 'Processes belonging to this organization' })
  processes!: ProcessConnection & {}

  @Field(() => ProgramsConnection, { description: 'Programs this organization participates in' })
  programs!: ProgramsConnection & {}

  @Field(() => VariantsConnection, { description: 'Product variants linked to this organization' })
  variants!: VariantsConnection & {}

  @Field(() => OrgsConnection, {
    description: 'Similar organizations related to this organization',
  })
  related!: OrgsConnection & {}

  @Field(() => OrgHistoryConnection)
  history!: OrgHistoryConnection & {}
}
registerModel('Org', Org)

@ObjectType()
export class OrgHistory extends BaseModel {
  @Field(() => Org)
  org!: Org

  @Field(() => LuxonDateTimeResolver)
  datetime!: DateTime

  @Field(() => User)
  user!: ModelRef<User, UserEntity>

  @Field(() => Org, { nullable: true })
  original?: Org

  @Field(() => Org, { nullable: true })
  changes?: Org
}

@ObjectType()
export class OrgHistoryConnection extends Paginated(OrgHistory) {}

@ObjectType()
export class OrgsConnection extends Paginated(Org) {}

@ArgsType()
export class OrgsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema

  orderBy(): string[] {
    return ['relevance']
  }

  orderDir(): OrderDirection[] {
    return [OrderDirection.DESC]
  }
}

@ArgsType()
export class OrgHistoryArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema

  // OrgHistory's primary key is (org, datetime) — there's no `id`.
  orderBy(): string[] {
    return ['datetime']
  }
}

@ArgsType()
export class OrgUsersArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class OrgPlacesArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class OrgProcessesArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class OrgProgramsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class OrgVariantsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@InputType()
export class CreateOrgInput extends ChangeInputWithLang {
  @Field(() => String)
  name!: string

  @Field(() => String)
  slug!: string

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => String, { nullable: true })
  avatarURL?: string

  @Field(() => String, { nullable: true })
  websiteURL?: string
}

@InputType()
export class UpdateOrgInput extends ChangeInputWithLang {
  @Field(() => String)
  @Validate(IsNanoID)
  id!: string

  @Field(() => String, { nullable: true })
  name?: string

  @Field(() => String, { nullable: true })
  slug?: string

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => String, { nullable: true })
  avatarURL?: string

  @Field(() => String, { nullable: true })
  websiteURL?: string
}

@ObjectType()
export class CreateOrgOutput {
  @Field(() => Change, { nullable: true })
  change?: Change & {}

  @Field(() => Org, { nullable: true })
  org?: Org
}

@ObjectType()
export class UpdateOrgOutput {
  @Field(() => Change, {
    nullable: true,
    description: 'The change tracking record, if the update was submitted via a change',
  })
  change?: Change & {}

  @Field(() => Org, {
    nullable: true,
    description: 'The org including the proposed changes',
  })
  org?: Org

  @Field(() => Org, {
    nullable: true,
    description:
      'The org as currently persisted in the database, before any pending change is merged',
  })
  currentOrg?: Org & {}
}
