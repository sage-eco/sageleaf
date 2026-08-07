import { ArgsType, Field, ID, InputType, ObjectType, registerEnumType } from '@nestjs/graphql'
import { Validate } from 'class-validator'
import { JSONObjectResolver } from 'graphql-scalars'
import GraphQLUpload from 'graphql-upload/GraphQLUpload.mjs'
import type { FileUpload } from 'graphql-upload/processRequest.mjs'
import { DateTime } from 'luxon'
import { z } from 'zod/v4'

import { ChangesConnection } from '@src/changes/change.model'
import { SourceType } from '@src/changes/source.entity'
import { LuxonDateTimeResolver } from '@src/common/datetime.model'
import { IsNanoID } from '@src/common/validator.model'
import { type JSONObject } from '@src/common/z.schema'
import { IDCreatedUpdated, registerModel } from '@src/graphql/base.model'
import { Node } from '@src/graphql/node.model'
import { Paginated, PaginationBasicArgs } from '@src/graphql/paginated'
import { User } from '@src/users/users.model'

registerEnumType(SourceType, {
  name: 'SourceType',
  description: 'Type of source data',
})

@ObjectType({
  implements: () => [Node],
  description: 'A reference source used to support data changes, such as a URL, PDF, or image',
})
export class Source extends IDCreatedUpdated implements Node {
  @Field(() => SourceType)
  type!: SourceType

  @Field(() => LuxonDateTimeResolver, {
    nullable: true,
    description: 'Timestamp when this source was processed and ingested',
  })
  processedAt?: DateTime

  @Field(() => String, {
    nullable: true,
    description: 'Reference location or citation string (e.g. page number, URL fragment)',
  })
  location?: string

  @Field(() => JSONObjectResolver, {
    nullable: true,
    description: 'Extracted or structured content from the source',
  })
  content?: JSONObject

  @Field(() => String, { nullable: true })
  contentURL?: string

  @Field(() => User)
  user!: User & {}

  @Field(() => ChangesConnection)
  changes!: ChangesConnection & {}

  @Field(() => JSONObjectResolver, {
    nullable: true,
    description: 'Additional metadata about the source (e.g. author, publication date)',
  })
  metadata?: JSONObject
}
registerModel('Source', Source)

@ObjectType()
export class SourcesConnection extends Paginated(Source) {}

@ArgsType()
export class SourcesArgs extends PaginationBasicArgs {
  static schema = PaginationBasicArgs.schema.extend({
    type: z.enum(SourceType).optional(),
  })

  @Field(() => SourceType, { nullable: true })
  type?: SourceType
}

@InputType()
export class CreateSourceInput {
  @Field(() => SourceType)
  type!: SourceType

  @Field(() => String, { nullable: true })
  location?: string

  @Field(() => JSONObjectResolver, { nullable: true })
  content?: JSONObject

  @Field(() => String, { nullable: true })
  contentURL?: string

  @Field(() => JSONObjectResolver, { nullable: true })
  metadata?: JSONObject
}

@InputType()
export class UpdateSourceInput {
  @Field(() => ID)
  id!: string

  @Field(() => SourceType, { nullable: true })
  type?: SourceType

  @Field(() => String, { nullable: true })
  location?: string

  @Field(() => JSONObjectResolver, { nullable: true })
  content?: JSONObject

  @Field(() => String, { nullable: true })
  contentURL?: string

  @Field(() => JSONObjectResolver, { nullable: true })
  metadata?: JSONObject
}

@ObjectType()
export class CreateSourceOutput {
  @Field(() => Source, { nullable: true })
  source?: Source
}

@ObjectType()
export class UpdateSourceOutput {
  @Field(() => Source, { nullable: true })
  source?: Source
}

@ObjectType()
export class DeleteSourceOutput {
  @Field(() => Boolean, { nullable: true })
  success?: boolean
}

@InputType()
export class LinkSourceInput {
  @Field(() => ID)
  @Validate(IsNanoID)
  id!: string

  @Field(() => JSONObjectResolver, { description: 'JSON-LD document with @id and @type' })
  jsonld!: JSONObject
}

@InputType()
export class UnlinkSourceInput {
  @Field(() => ID)
  @Validate(IsNanoID)
  id!: string

  @Field(() => JSONObjectResolver, { description: 'JSON-LD document identifying the node by @id' })
  jsonld!: JSONObject
}

@ObjectType()
export class LinkSourceOutput {
  @Field(() => Source, { nullable: true })
  source?: Source & {}
}

@ObjectType()
export class UploadSourceOutput {
  @Field(() => Source, { nullable: true })
  source?: Source
}

@InputType()
export class UploadSourceInput {
  @Field(() => ID)
  source!: string

  @Field(() => GraphQLUpload)
  file!: Promise<FileUpload>

  @Field(() => JSONObjectResolver, { nullable: true })
  metadata?: JSONObject
}

@ObjectType()
export class UnlinkSourceOutput {
  @Field(() => Source, { nullable: true })
  source?: Source & {}
}

@ObjectType()
export class MarkSourceProcessedOutput {
  @Field(() => Boolean, { nullable: true })
  success?: boolean
}
