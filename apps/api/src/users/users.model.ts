import { ArgsType, Directive, Field, ObjectType } from '@nestjs/graphql'
import { IsEmail, IsOptional, IsUrl, MaxLength } from 'class-validator'

import { ChangesConnection } from '@src/changes/change.model'
import { IDCreatedUpdated } from '@src/graphql/base.model'
import { Paginated, PaginationBasicArgs } from '@src/graphql/paginated'
import { Org } from '@src/users/org.model'

@ObjectType()
export class UserProfile {
  @Field({ nullable: true })
  bio?: string
}

@ObjectType({ description: 'A registered user of the platform' })
export class User extends IDCreatedUpdated {
  @Field({ nullable: true })
  name?: string

  @Field()
  @Directive('@cacheControl(maxAge: 60, scope: PRIVATE)')
  @IsEmail()
  @MaxLength(1024)
  email!: string

  @Field()
  @Directive('@cacheControl(maxAge: 60, scope: PRIVATE)')
  emailVerified!: boolean

  @Field()
  @MaxLength(64)
  username!: string

  @Field({ nullable: true })
  @IsOptional()
  @IsUrl()
  avatarURL?: string

  @Field({ nullable: true })
  lang?: string

  @Field({ nullable: true, description: 'Extended profile information for this user' })
  profile?: UserProfile

  @Field(() => UserOrgsConnection, { description: 'Organizations this user belongs to' })
  orgs!: UserOrgsConnection & {}

  @Field(() => ChangesConnection, { description: 'Changes this user is involved in' })
  changes!: ChangesConnection & {}
}

@ObjectType({ description: 'Membership of a user in an organization' })
export class UserOrg {
  @Field(() => Org)
  org!: Org & {}

  @Field(() => String, { nullable: true, description: "The user's role within the organization" })
  role?: string
}

@ObjectType()
export class UserConnection extends Paginated(User) {}

@ObjectType()
export class UserOrgsConnection extends Paginated(UserOrg) {}

@ArgsType()
export class UsersOrgsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class UserChangesArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}
