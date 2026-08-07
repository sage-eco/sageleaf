import { ArgsType, Field, ID, InputType, ObjectType } from '@nestjs/graphql'
import { IsOptional, MaxLength } from 'class-validator'
import { DateTime } from 'luxon'
import { z } from 'zod/v4'

import { ChangeInputWithLang } from '@src/changes/change-ext.model'
import { Change } from '@src/changes/change.model'
import { LuxonDateTimeResolver } from '@src/common/datetime.model'
import { CreatedUpdated, registerModel, TranslatedInput } from '@src/graphql/base.model'
import { Named } from '@src/graphql/interfaces.model'
import { Node } from '@src/graphql/node.model'
import { Paginated, PaginationBasicArgs } from '@src/graphql/paginated'
import { ComponentsConnection } from '@src/process/component.model'
import { ProcessConnection } from '@src/process/process.model'

@ObjectType({
  implements: () => [Named, Node],
  description: 'A raw or processed material that physical components are composed of',
})
export class Material extends CreatedUpdated implements Named, Node {
  @Field(() => ID)
  id!: string

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(1024)
  name?: string

  @Field(() => String, { nullable: true })
  @IsOptional()
  @MaxLength(100_000)
  desc?: string

  @Field(() => [String], { nullable: true })
  synonyms?: string[]

  @Field(() => Boolean, {
    description: 'If true, this is an internal technical classification not shown to end-users',
  })
  technical: boolean = false

  @Field(() => String, {
    nullable: true,
    description: 'The physical form or shape of the material (e.g. film, rigid, fibre)',
  })
  shape?: string

  @Field(() => MaterialsConnection, { description: 'Direct parent materials in the hierarchy' })
  parents!: MaterialsConnection & {}

  @Field(() => MaterialsConnection, { description: 'Direct child materials in the hierarchy' })
  children!: MaterialsConnection & {}

  @Field(() => MaterialsConnection, { description: 'All ancestor materials up the hierarchy' })
  ancestors!: MaterialsConnection & {}

  @Field(() => MaterialsConnection, { description: 'All descendant materials down the hierarchy' })
  descendants!: MaterialsConnection & {}

  @Field(() => ComponentsConnection, { description: 'Components that primarily use this material' })
  primaryComponents!: ComponentsConnection & {}

  @Field(() => ComponentsConnection, { description: 'All components that include this material' })
  components!: ComponentsConnection & {}

  @Field(() => ProcessConnection, {
    description: 'Recycling or disposal processes for this material',
  })
  processes!: ProcessConnection & {}

  @Field(() => MaterialsConnection, { description: 'Similar materials related to this material' })
  related!: MaterialsConnection & {}
}
registerModel('Material', Material)

@ObjectType()
export class MaterialHistory {
  @Field(() => String)
  material_id!: string

  @Field(() => LuxonDateTimeResolver)
  datetime!: DateTime

  @Field(() => String, { nullable: true })
  original?: string

  @Field(() => String, { nullable: true })
  changes?: string
}

@ObjectType()
export class MaterialsConnection extends Paginated(Material) {}

@ArgsType()
export class MaterialsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class PrimaryComponentsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class ComponentsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class ProcessesArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

export const MaterialIDSchema = z.string().meta({
  id: 'Material',
  name: 'Material ID',
})

@InputType()
export class CreateMaterialInput extends ChangeInputWithLang {
  @Field(() => String)
  @MaxLength(1024)
  name!: string

  @Field(() => [TranslatedInput], { nullable: true })
  nameTr?: TranslatedInput[]

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => [TranslatedInput], { nullable: true })
  descTr?: TranslatedInput[]

  @Field(() => Boolean, {
    description: 'If true, this is an internal technical classification not shown to end-users',
  })
  technical: boolean = false

  @Field(() => [ID], { nullable: true, description: 'IDs of parent materials in the hierarchy' })
  parents?: string[]

  @Field(() => [ID], { nullable: true, description: 'IDs of child materials in the hierarchy' })
  children?: string[]
}

@InputType()
export class UpdateMaterialInput extends ChangeInputWithLang {
  @Field(() => ID)
  id!: string

  @Field(() => String, { nullable: true })
  @MaxLength(1024)
  name?: string

  @Field(() => [TranslatedInput], { nullable: true })
  nameTr?: TranslatedInput[]

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => [TranslatedInput], { nullable: true })
  descTr?: TranslatedInput[]

  @Field(() => Boolean, {
    nullable: true,
    description: 'If true, this is an internal technical classification not shown to end-users',
  })
  technical?: boolean

  @Field(() => [ID], { nullable: true, description: 'IDs of parent materials in the hierarchy' })
  parents?: string[]

  @Field(() => [ID], { nullable: true, description: 'IDs of child materials in the hierarchy' })
  children?: string[]
}

@ObjectType()
export class CreateMaterialOutput {
  @Field(() => Change, { nullable: true })
  change?: Change & {}

  @Field(() => Material, { nullable: true })
  material?: Material
}

@ObjectType()
export class UpdateMaterialOutput {
  @Field(() => Change, { nullable: true })
  change?: Change & {}

  @Field(() => Material, { nullable: true })
  material?: Material
}
