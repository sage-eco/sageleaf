import { Field, InputType, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class LinkOpenGraph {
  @Field(() => String, { nullable: true })
  title?: string

  @Field(() => String, { nullable: true })
  description?: string

  @Field(() => String, { nullable: true })
  image?: string

  @Field(() => String, { nullable: true })
  siteName?: string
}

@ObjectType()
export class ExternalLink {
  @Field(() => String)
  url!: string

  @Field(() => String, { nullable: true })
  icon?: string

  @Field(() => String, { nullable: true })
  locale?: string

  @Field(() => String, { nullable: true })
  label?: string

  @Field(() => LinkOpenGraph, { nullable: true })
  openGraph?: LinkOpenGraph
}

@InputType()
export class ExternalLinkInput {
  @Field(() => String)
  url!: string

  @Field(() => String, { nullable: true })
  icon?: string

  @Field(() => String, { nullable: true })
  locale?: string

  @Field(() => String, { nullable: true })
  label?: string
}
