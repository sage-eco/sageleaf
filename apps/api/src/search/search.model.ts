import {
  ArgsType,
  createUnionType,
  Field,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from '@nestjs/graphql'
import { z } from 'zod/v4'

import { Place } from '@src/geo/place.model'
import { Region } from '@src/geo/region.model'
import { IPaginatedType, PageInfo } from '@src/graphql/paginated'
import { Component } from '@src/process/component.model'
import { Material } from '@src/process/material.model'
import { Category } from '@src/product/category.model'
import { Item } from '@src/product/item.model'
import { Variant } from '@src/product/variant.model'
import type { SearchBackendFacetResult } from '@src/search/search.backend'
import { Org } from '@src/users/org.model'

export enum SearchType {
  CATEGORY = 'category',
  ITEM = 'item',
  VARIANT = 'variant',
  COMPONENT = 'component',
  ORG = 'org',
  PLACE = 'place',
  REGION = 'region',
  MATERIAL = 'material',
}

export const SearchResultItem = createUnionType({
  name: 'SearchResultItem',
  types: () => [Category, Item, Variant, Component, Org, Place, Region, Material] as const,
  resolveType: (value) => {
    return value._type
  },
})

@ObjectType()
class SearchResultItemEdge {
  @Field(() => String)
  cursor: string = ''

  @Field(() => SearchResultItem)
  node!: typeof SearchResultItem
}

@ObjectType()
export class SearchFacetCount {
  @Field(() => String)
  value: string = ''

  @Field(() => Int)
  count: number = 0

  @Field(() => String)
  label: string = ''

  @Field(() => SearchType, { nullable: true })
  type?: SearchType | null
}

@ObjectType()
export class SearchFacetResult {
  @Field(() => String)
  field: string = ''

  @Field(() => [SearchFacetCount])
  counts: SearchFacetCount[] = []

  @Field(() => Int, { nullable: true })
  totalValues?: number
}

@ObjectType()
export class SearchResultConnection implements IPaginatedType<typeof SearchResultItem> {
  @Field(() => [SearchResultItemEdge])
  edges: SearchResultItemEdge[] = []

  @Field(() => [SearchResultItem])
  nodes: (typeof SearchResultItem)[] = []

  @Field(() => Int)
  totalCount: number = 0

  @Field(() => PageInfo)
  pageInfo: PageInfo = { hasNextPage: false, hasPreviousPage: false }

  _facets?: SearchBackendFacetResult[]
}

registerEnumType(SearchType, {
  name: 'SearchType',
  description: 'The item type to search',
})

@InputType()
export class SearchFacetFilterInput {
  @Field(() => String)
  field!: string

  @Field(() => [String])
  values!: string[]
}

export const SearchArgsSchema = z.object({
  query: z.string(),
  types: z.array(z.enum(SearchType)).optional(),
  latlong: z.array(z.number()).min(2).max(4).optional(),
  limit: z.number().int().positive().optional(),
  offset: z.number().int().min(0).optional(),
  filters: z.array(z.object({ field: z.string(), values: z.array(z.string()).min(1) })).optional(),
})

@ArgsType()
export class SearchArgs {
  static schema = SearchArgsSchema

  @Field(() => String)
  query!: string

  @Field(() => [SearchType], { nullable: true })
  types?: SearchType[]

  @Field(() => [Number], { nullable: true })
  latlong?: number[]

  @Field(() => Int, { nullable: true })
  limit?: number

  @Field(() => Int, { nullable: true })
  offset?: number

  @Field(() => [SearchFacetFilterInput], { nullable: true })
  filters?: SearchFacetFilterInput[]
}
