import { Field, ObjectType, registerEnumType } from '@nestjs/graphql'

import {
  ProcessInstructionsAccess,
  ProcessInstructionsContainerType,
} from '@src/process/process.entity'

export enum StreamScoreRating {
  A_PLUS = 'A_PLUS',
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  F = 'F',
  G = 'G',
  UNKNOWN = 'UNKNOWN',
}

registerEnumType(StreamScoreRating, {
  name: 'StreamScoreRating',
  description: 'A rating enum used to describe scores',
})

@ObjectType({
  description: 'A recyclability score for a component or variant in a recycling stream',
})
export class StreamScore {
  @Field(() => Number, { nullable: true, description: 'Numerical recyclability score' })
  score?: number

  @Field(() => Number, { nullable: true, description: 'Minimum possible score for this stream' })
  minScore?: number

  @Field(() => Number, { nullable: true, description: 'Maximum possible score for this stream' })
  maxScore?: number

  @Field(() => StreamScoreRating, {
    nullable: true,
    description: 'Qualitative rating for this score',
  })
  rating?: StreamScoreRating

  @Field(() => String, { nullable: true, description: 'Formatted display label for the rating' })
  ratingF?: string

  @Field(() => StreamScoreRating, {
    nullable: true,
    description: 'Quality rating for the underlying recycling data',
  })
  dataQuality?: StreamScoreRating

  @Field(() => String, {
    nullable: true,
    description: 'Formatted display label for the data quality rating',
  })
  dataQualityF?: string

  @Field(() => String, { nullable: true })
  name?: string
}

@ObjectType()
export class ContainerShape {
  @Field(() => Number, { nullable: true })
  height?: number

  @Field(() => Number, { nullable: true })
  width?: number

  @Field(() => Number, { nullable: true })
  depth?: number
}

@ObjectType()
export class ContainerImageEntryPoint {
  @Field(() => Number)
  x!: number

  @Field(() => Number)
  y!: number

  @Field(() => String)
  side!: 'left' | 'right' | 'top' | 'bottom'
}

@ObjectType({ description: 'A collection container for a recycling stream (e.g. a bin or bag)' })
export class Container {
  @Field(() => String, { description: 'Container type (e.g. BIN, BAG, BOX)' })
  type!: ProcessInstructionsContainerType

  @Field(() => String, {
    nullable: true,
    description: 'Access method for the container (e.g. CURBSIDE, DROP_OFF)',
  })
  access?: ProcessInstructionsAccess

  @Field(() => String, { nullable: true, description: 'URL of an image of the container' })
  image?: string

  @Field(() => String, { nullable: true, description: 'Typical color of the container' })
  color?: string

  @Field(() => ContainerShape, {
    nullable: true,
    description: 'Physical dimensions of the container',
  })
  shape?: ContainerShape

  @Field(() => ContainerImageEntryPoint, {
    nullable: true,
    description: 'Coordinates for the item entry point on the container image',
  })
  imageEntryPoint?: ContainerImageEntryPoint
}

export enum CaveatLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

registerEnumType(CaveatLevel, {
  name: 'CaveatLevel',
  description: 'The severity level of a caveat',
})

@ObjectType({ description: 'Recycling stream caveats' })
export class StreamCaveats {
  @Field(() => CaveatLevel)
  level!: CaveatLevel

  @Field(() => String, { nullable: true })
  name?: string

  @Field(() => String, { nullable: true })
  desc?: string
}

@ObjectType({
  description: 'A recycling collection stream in a region, with score and container information',
})
export class RecyclingStream {
  @Field(() => String, { nullable: true })
  name?: string

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => StreamScore, {
    nullable: true,
    description: 'Aggregated recyclability score for this stream',
  })
  score?: StreamScore

  @Field(() => [StreamScore], {
    nullable: true,
    description: 'Per-material recyclability scores within this stream',
  })
  scores?: StreamScore[]

  @Field(() => Container, {
    nullable: true,
    description: 'The collection container used in this stream',
  })
  container?: Container

  @Field(() => [StreamCaveats], {
    nullable: true,
    description: 'Caveats about this stream',
  })
  caveats?: StreamCaveats[]
}

@ObjectType({ description: 'Additional context about a recycling recommendation for a component' })
export class StreamContext {
  @Field(() => String, { description: 'Identifier key for this context entry' })
  key!: string

  @Field(() => String, { nullable: true })
  name?: string

  @Field(() => String, { nullable: true })
  markdown?: string
}

@ObjectType({ description: 'A recycling option for a component in a specific recycling stream' })
export class ComponentRecycle {
  @Field(() => RecyclingStream, { nullable: true })
  stream?: RecyclingStream & {}

  @Field(() => [StreamContext])
  context: StreamContext[] = []
}

@ObjectType({
  description: 'A reduce stream describing ways to reduce waste or resource consumption',
})
export class ReduceStream {
  @Field(() => String, { nullable: true })
  name?: string

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => StreamScore, { nullable: true, description: 'Aggregated score for this stream' })
  score?: StreamScore

  @Field(() => [StreamScore], {
    nullable: true,
    description: 'Per-material scores within this stream',
  })
  scores?: StreamScore[]

  @Field(() => [StreamCaveats], { nullable: true, description: 'Caveats about this stream' })
  caveats?: StreamCaveats[]
}

@ObjectType({ description: 'A reuse stream describing ways to reuse, repair, or refurbish' })
export class ReuseStream {
  @Field(() => String, { nullable: true })
  name?: string

  @Field(() => String, { nullable: true })
  desc?: string

  @Field(() => StreamScore, { nullable: true, description: 'Aggregated score for this stream' })
  score?: StreamScore

  @Field(() => [StreamScore], {
    nullable: true,
    description: 'Per-material scores within this stream',
  })
  scores?: StreamScore[]

  @Field(() => Container, { nullable: true, description: 'The collection container used' })
  container?: Container

  @Field(() => [StreamCaveats], { nullable: true, description: 'Caveats about this stream' })
  caveats?: StreamCaveats[]
}

@ObjectType({ description: 'A reduce option for a component' })
export class ComponentReduce {
  @Field(() => ReduceStream, { nullable: true })
  stream?: ReduceStream & {}

  @Field(() => [StreamContext])
  context: StreamContext[] = []
}

@ObjectType({ description: 'A reuse option for a component' })
export class ComponentReuse {
  @Field(() => ReuseStream, { nullable: true })
  stream?: ReuseStream & {}

  @Field(() => [StreamContext])
  context: StreamContext[] = []
}
