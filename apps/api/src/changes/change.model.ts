import { ArgsType, Field, ID, InputType, Int, ObjectType } from '@nestjs/graphql'
import { JSONObjectResolver } from 'graphql-scalars'
import { z } from 'zod/v4'

import { EditModelTypeSchema } from '@src/changes/change-type.schema'
import { ChangeStatus } from '@src/changes/change.entity'
import { EditModel, EditModelType } from '@src/changes/change.enum'
import { Source } from '@src/changes/source.model'
import { type JSONObject } from '@src/common/z.schema'
import { BaseModel, IDCreatedUpdated } from '@src/graphql/base.model'
import { OrderDirection, Paginated, PaginationBasicArgs } from '@src/graphql/paginated'
import { User } from '@src/users/users.model'

@ObjectType({ description: 'A background job' })
export class Job {
  @Field(() => ID)
  id!: string

  @Field(() => String)
  name!: string

  @Field(() => String)
  status!: string

  @Field(() => String)
  type!: string

  @Field(() => Int)
  progress!: number
}

@ObjectType()
export class JobsConnection extends Paginated(Job) {}

@ObjectType({ description: 'A tracked edit to a single entity within a change' })
export class Edit extends BaseModel {
  @Field(() => String, {
    description: 'The type name of the entity being edited (e.g. Item, Component)',
  })
  entityName!: string

  @Field(() => ID, { nullable: true })
  id?: string

  @Field(() => EditModel, {
    nullable: true,
    description: 'The state of the entity before this edit',
  })
  original?: typeof EditModel

  @Field(() => EditModel, {
    nullable: true,
    description: 'The proposed state of the entity after this edit',
  })
  changes?: typeof EditModel

  @Field(() => JSONObjectResolver, {
    nullable: true,
    description: 'The raw JSON of the entity before this edit',
  })
  originalJSON?: JSONObject

  @Field(() => JSONObjectResolver, {
    nullable: true,
    description: 'The raw JSON of the proposed entity changes',
  })
  changesJSON?: JSONObject

  @Field(() => JSONObjectResolver, {
    nullable: true,
    description: 'Input values for creating a new entity',
  })
  createInput?: JSONObject

  @Field(() => JSONObjectResolver, {
    nullable: true,
    description: 'Current input values for updating an existing entity',
  })
  updateInput?: JSONObject

  @Field(() => JSONObjectResolver, {
    nullable: true,
    description: 'Input values for creating a new entity, copying existing values',
  })
  copyInput?: JSONObject

  @Field(() => Boolean, {
    description:
      'True if a field this edit modifies has changed in the database since this edit was created',
  })
  conflict!: boolean

  @Field(() => String, {
    nullable: true,
    description: 'Description of the conflict, if any',
  })
  conflictDesc?: string
}

@ObjectType()
export class DirectEdit {
  @Field(() => String)
  entityName!: string

  @Field(() => ID, { nullable: true })
  id?: string

  @Field(() => JSONObjectResolver, { nullable: true })
  createInput?: JSONObject

  @Field(() => JSONObjectResolver, { nullable: true })
  updateInput?: JSONObject

  @Field(() => JSONObjectResolver, { nullable: true })
  copyInput?: JSONObject

  // Not exposed in GraphQL
  original?: typeof EditModel
  changes?: typeof EditModel
}

@ObjectType()
export class ChangeEditsConnection extends Paginated(Edit) {}

@ObjectType({ description: 'A proposed or merged set of edits to one or more data models' })
export class Change extends IDCreatedUpdated {
  @Field(() => String, { nullable: true })
  title?: string

  @Field(() => String, { nullable: true })
  description?: string

  @Field(() => ChangeStatus)
  status!: ChangeStatus & {}

  @Field(() => User, { description: 'The user who created this change' })
  user!: User & {}

  @Field(() => ChangeEditsConnection, {
    description: 'The individual entity edits included in this change',
  })
  edits!: ChangeEditsConnection

  @Field(() => ChangeSourcesConnection, { description: 'Source references supporting this change' })
  sources!: ChangeSourcesConnection & {}

  @Field(() => JobsConnection, {
    nullable: true,
    description: 'Active and past jobs for this change',
  })
  jobs?: JobsConnection
}

@ObjectType()
export class ChangeSource {
  @Field(() => Source)
  source!: Source & {}
}

@ObjectType()
export class ChangeSourcesConnection extends Paginated(ChangeSource) {}

@ObjectType()
export class ChangesConnection extends Paginated(Change) {}

@ArgsType()
export class ChangesArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema.extend({
    status: z.enum(ChangeStatus).optional(),
    userID: z.string().optional(),
  })

  @Field(() => ChangeStatus, { nullable: true })
  status?: ChangeStatus

  @Field(() => ID, { nullable: true })
  userID?: string

  orderBy(): string[] {
    return ['updatedAt']
  }

  orderDir(): OrderDirection[] {
    return [OrderDirection.DESC]
  }
}

@ArgsType()
export class ChangeSourcesArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema
}

@ArgsType()
export class ChangeJobsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema.extend({
    active: z.boolean().optional(),
  })

  @Field(() => Boolean, {
    nullable: true,
    description: 'If true, return only queued or running jobs',
  })
  active?: boolean
}

@ArgsType()
export class ChangeEditsArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema.extend({
    id: z.string().optional(),
    type: EditModelTypeSchema.optional(),
  })

  @Field(() => ID, { nullable: true })
  id?: string

  @Field(() => EditModelType, { nullable: true })
  type?: EditModelType

  // `Edit.id` is the ID of the edited entity (see EditTransform), not a
  // unique/orderable key, so cursor pagination is keyed on the ChangeEdits
  // row's own primary key instead.
  orderBy(): string[] {
    return ['edit_id']
  }
}

@ArgsType()
export class DirectEditArgs {
  static schema = z.object({
    id: z.string().optional(),
    entityName: z.string().optional(),
    changeID: z.string().optional(),
  })

  @Field(() => ID, { nullable: true })
  id?: string

  @Field(() => String, { nullable: true })
  entityName?: string

  @Field(() => ID, { nullable: true })
  changeID?: string
}

@InputType()
export class UpdateChangeInput {
  @Field(() => ID)
  id!: string

  @Field(() => String, { nullable: true })
  title?: string

  @Field(() => String, { nullable: true })
  description?: string

  @Field(() => ChangeStatus, { nullable: true })
  status?: ChangeStatus & {}

  @Field(() => [ID], { nullable: true })
  sources?: string[]
}

@ObjectType()
export class CreateChangeOutput {
  @Field(() => Change, { nullable: true })
  change?: Change
}

@ObjectType()
export class UpdateChangeOutput {
  @Field(() => Change, { nullable: true })
  change?: Change
}

@ObjectType()
export class DeleteChangeOutput {
  @Field(() => Boolean, { nullable: true })
  success?: boolean
}

@ObjectType()
export class MergeChangeOutput {
  @Field(() => Change, { nullable: true })
  change?: Change
}

@ObjectType()
export class DiscardEditOutput {
  @Field(() => Boolean, { nullable: true })
  success?: boolean

  @Field(() => ID, { nullable: true })
  id?: string
}

@ObjectType()
export class AddRefOutput {
  @Field(() => Change, { nullable: true })
  change?: Change

  @Field(() => EditModel, { nullable: true })
  model?: typeof EditModel

  @Field(() => EditModel, { nullable: true })
  currentModel?: typeof EditModel
}

@ObjectType()
export class RemoveRefOutput {
  @Field(() => Change, { nullable: true })
  change?: Change

  @Field(() => EditModel, { nullable: true })
  model?: typeof EditModel

  @Field(() => EditModel, { nullable: true })
  currentModel?: typeof EditModel
}

export interface MergeInput {
  apply?: boolean
}
