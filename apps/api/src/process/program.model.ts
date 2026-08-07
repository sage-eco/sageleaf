import { ArgsType, Field, ID, InputType, ObjectType } from '@nestjs/graphql'
import { JSONObjectResolver } from 'graphql-scalars'
import { DateTime } from 'luxon'

import { ChangeInputWithLang } from '@src/changes/change-ext.model'
import { Change } from '@src/changes/change.model'
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
import { ExternalLink, ExternalLinkInput } from '@src/graphql/link.model'
import { Node } from '@src/graphql/node.model'
import { OrderDirection, Paginated, PaginationBasicArgs } from '@src/graphql/paginated'
import { ProcessConnection } from '@src/process/process.model'
import { ProgramStatus } from '@src/process/program.entity'
import { TagConnection } from '@src/process/tag.model'
import { OrgsConnection } from '@src/users/org.model'
import { User as UserEntity } from '@src/users/users.entity'
import { User } from '@src/users/users.model'

@ObjectType()
export class ProgramSocial {
  @Field(() => [ExternalLink], { nullable: true })
  links?: ExternalLink[]
}

@InputType()
export class ProgramSocialInput {
  @Field(() => [ExternalLinkInput], { nullable: true })
  links?: ExternalLinkInput[]
}

@ObjectType()
export class ProgramInstructions {
  @Field(() => ExternalLink, { nullable: true })
  primaryLink?: ExternalLink
}

@InputType()
export class ProgramInstructionsInput {
  @Field(() => [ExternalLinkInput], { nullable: true })
  primaryLinks?: ExternalLinkInput[]
}

@ObjectType({
  implements: () => [Named, Node],
  description: 'An administrative description of circular economy processes',
})
export class Program extends IDCreatedUpdated implements Named, Node {
  @Field(() => String)
  name!: string

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => ProgramSocial, { nullable: true })
  social?: ProgramSocial

  @Field(() => ProgramInstructions, { nullable: true })
  instructions?: ProgramInstructions

  @Field(() => String)
  status!: ProgramStatus

  @Field(() => Region, { nullable: true })
  region?: Region & {}

  @Field(() => OrgsConnection, { description: 'Organizations involved in this program' })
  orgs!: OrgsConnection & {}

  @Field(() => ProcessConnection, { description: 'Processes run by this program' })
  processes!: ProcessConnection & {}

  @Field(() => TagConnection, { description: 'Metadata tags applied to this program' })
  tags!: TagConnection & {}

  @Field(() => ProgramHistoryConnection, {
    description: 'Audit history of changes to this program',
  })
  history!: ProgramHistoryConnection & {}
}
registerModel('Program', Program)

@ObjectType()
export class ProgramHistory extends BaseModel {
  @Field(() => Program)
  program!: Program

  @Field(() => LuxonDateTimeResolver)
  datetime!: DateTime

  @Field(() => User)
  user!: ModelRef<User, UserEntity>

  @Field(() => Program, { nullable: true })
  original?: Program

  @Field(() => Program, { nullable: true })
  changes?: Program
}

@ObjectType()
export class ProgramHistoryConnection extends Paginated(ProgramHistory) {}

@ObjectType()
export class ProgramsConnection extends Paginated(Program) {}

@ArgsType()
export class ProgramHistoryArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema

  // ProgramHistory's primary key is (program, datetime) — there's no `id`.
  orderBy(): string[] {
    return ['datetime']
  }
}

@ArgsType()
export class ProgramsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema

  orderBy(): string[] {
    return ['relevance']
  }

  orderDir(): OrderDirection[] {
    return [OrderDirection.DESC]
  }
}

@ArgsType()
export class ProgramOrgsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class ProgramProcessesArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class ProgramTagsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@InputType()
export class ProgramOrgsInput {
  @Field(() => ID)
  id!: string

  @Field(() => String, { nullable: true })
  role?: string
}

@InputType()
export class ProgramProcessesInput {
  @Field(() => ID)
  id!: string
}

@InputType()
export class ProgramTagsInput {
  @Field(() => ID)
  id!: string

  @Field(() => JSONObjectResolver, { nullable: true })
  meta?: JSONObject
}

@InputType()
export class CreateProgramInput extends ChangeInputWithLang {
  @Field(() => String, { nullable: true })
  name?: string

  @Field(() => [TranslatedInput], { nullable: true })
  nameTr?: TranslatedInput[]

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => [TranslatedInput], { nullable: true })
  descTr?: TranslatedInput[]

  @Field(() => ProgramSocialInput, { nullable: true })
  social?: ProgramSocialInput

  @Field(() => ProgramInstructionsInput, { nullable: true })
  instructions?: ProgramInstructionsInput

  @Field(() => String)
  status!: ProgramStatus

  @Field(() => ID, { nullable: true })
  region?: string

  @Field(() => [ProgramOrgsInput], { nullable: true })
  orgs?: ProgramOrgsInput[]

  @Field(() => [ProgramProcessesInput], { nullable: true })
  processes?: ProgramProcessesInput[]

  @Field(() => [ProgramTagsInput], { nullable: true })
  tags?: ProgramTagsInput[]
}

@InputType()
export class UpdateProgramInput extends ChangeInputWithLang {
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

  @Field(() => ProgramSocialInput, { nullable: true })
  social?: ProgramSocialInput

  @Field(() => ProgramInstructionsInput, { nullable: true })
  instructions?: ProgramInstructionsInput

  @Field(() => String, { nullable: true })
  status?: ProgramStatus

  @Field(() => ID, { nullable: true })
  region?: string

  @Field(() => [ProgramOrgsInput], { nullable: true })
  orgs?: ProgramOrgsInput[]

  @Field(() => [ProgramOrgsInput], { nullable: true })
  addOrgs?: ProgramOrgsInput[]

  @Field(() => [ID], { nullable: true })
  removeOrgs?: string[]

  @Field(() => [ProgramProcessesInput], { nullable: true })
  processes?: ProgramProcessesInput[]

  @Field(() => [ProgramProcessesInput], { nullable: true })
  addProcesses?: ProgramProcessesInput[]

  @Field(() => [ID], { nullable: true })
  removeProcesses?: string[]

  @Field(() => [ProgramTagsInput], { nullable: true })
  tags?: ProgramTagsInput[]

  @Field(() => [ProgramTagsInput], { nullable: true })
  addTags?: ProgramTagsInput[]

  @Field(() => [ID], { nullable: true })
  removeTags?: string[]
}

@ObjectType()
export class CreateProgramOutput {
  @Field(() => Change, { nullable: true })
  change?: Change & {}

  @Field(() => Program, { nullable: true })
  program?: Program
}

@ObjectType()
export class UpdateProgramOutput {
  @Field(() => Change, { nullable: true })
  change?: Change & {}

  @Field(() => Program, { nullable: true })
  program?: Program

  @Field(() => Program, {
    nullable: true,
    description: 'The program as currently persisted in the database',
  })
  currentProgram?: Program & {}
}
