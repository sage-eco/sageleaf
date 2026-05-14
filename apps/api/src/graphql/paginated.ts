import { Type } from '@nestjs/common'
import {
  ArgsType,
  Field,
  InputType,
  Int,
  ObjectType,
  PickType,
  registerEnumType,
} from '@nestjs/graphql'
import { z } from 'zod/v4'

import { BaseModel } from '@src/graphql/base.model'

export const DEFAULT_PAGE_SIZE = 20

interface IEdgeType<T> {
  cursor: string
  node: T
}

interface IPageInfoType {
  hasNextPage: boolean
  hasPreviousPage: boolean
  startCursor?: string
  endCursor?: string
}

export interface IPaginatedType<T> {
  edges: Array<IEdgeType<T>>
  nodes: T[]
  totalCount: number
  pageInfo: IPageInfoType
}

export class EdgeType<T extends BaseModel> implements IEdgeType<T> {
  cursor: string = ''
  node!: T
}

export class PaginatedType<T extends BaseModel> implements IPaginatedType<T> {
  edges: IEdgeType<T>[] = []
  nodes: T[] = []
  totalCount: number = 0
  pageInfo: PageInfo = { hasNextPage: false, hasPreviousPage: false }
}

@ObjectType()
export abstract class PageInfo implements IPageInfoType {
  @Field()
  hasNextPage!: boolean

  @Field()
  hasPreviousPage!: boolean

  @Field(() => String, { nullable: true })
  startCursor?: string

  @Field(() => String, { nullable: true })
  endCursor?: string
}

export function Paginated<T>(classRef: Type<T>): Type<IPaginatedType<T>> {
  @ObjectType(`${classRef.name}Edge`)
  abstract class EdgeType {
    @Field(() => String)
    cursor: string = ''

    @Field(() => classRef)
    node!: T
  }

  @ObjectType({ isAbstract: true })
  abstract class PaginatedType implements IPaginatedType<T> {
    @Field(() => [EdgeType])
    edges: EdgeType[] = []

    @Field(() => [classRef])
    nodes: T[] = []

    @Field(() => Int)
    totalCount: number = 0

    @Field(() => PageInfo)
    pageInfo: PageInfo = { hasNextPage: false, hasPreviousPage: false }
  }
  return PaginatedType as Type<IPaginatedType<T>>
}

export enum OrderDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}
registerEnumType(OrderDirection, { name: 'OrderDirection' })

@InputType({ isAbstract: true })
export class OrderFieldType {
  @Field(() => OrderDirection)
  id!: OrderDirection
}

export interface IPaginationArgs {
  first?: number
  after?: string
  last?: number
  before?: string
  order?: Record<string, OrderDirection>[] | Record<string, OrderDirection>

  orderBy(): string[]
  orderDir(): OrderDirection[]
}

export type PaginationArgsSchema = z.ZodObject

@ArgsType()
export class PaginationBasicArgs implements IPaginationArgs {
  static schema = z
    .object({
      first: z.number().positive().nullish(),
      after: z.base64().nullish(),
      last: z.number().positive().nullish(),
      before: z.base64().nullish(),
    })
    .refine((data) => !(data.first && data.last), {
      message: 'Cannot use both `first` and `last`',
    })
    .refine((data) => !(data.after && data.before), {
      message: 'Cannot use both `after` and `before`',
    })

  @Field(() => Int, { nullable: true })
  first?: number

  @Field(() => String, { nullable: true })
  after?: string

  @Field(() => Int, { nullable: true })
  last?: number

  @Field(() => String, { nullable: true })
  before?: string

  orderBy(): string[] {
    return ['id']
  }

  orderDir(): OrderDirection[] {
    return [OrderDirection.ASC]
  }
}

export function PaginationOrderArgs(
  name: string,
  fields: readonly string[],
): Type<IPaginationArgs> {
  @InputType(`${name}Order`)
  class OrderType extends PickType(OrderFieldType, fields as any) {}

  @ArgsType()
  class PaginationOrderArgs extends PaginationBasicArgs {
    static schema = PaginationBasicArgs.schema.extend({
      order: z
        .union([
          z.array(z.record(z.string(), z.enum(OrderDirection))),
          z.record(z.string(), z.enum(OrderDirection)),
        ])
        .optional(),
    })

    @Field(() => [OrderType], { nullable: true })
    order?: Record<string, OrderDirection>[] | Record<string, OrderDirection>
  }
  return PaginationOrderArgs as Type<IPaginationArgs>
}

export function emptyPage(): IPaginatedType<any> {
  return {
    edges: [],
    nodes: [],
    totalCount: 0,
    pageInfo: { hasNextPage: false, hasPreviousPage: false },
  }
}
