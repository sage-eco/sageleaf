import { Args, Int, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { OptionalAuth } from '@src/auth/decorators'
import { BadRequestErr } from '@src/common/exceptions'
import { TransformService } from '@src/common/transform'
import { DEFAULT_PAGE_SIZE } from '@src/graphql/paginated'
import {
  SearchArgs,
  SearchArgsSchema,
  SearchFacetResult,
  SearchResultConnection,
} from '@src/search/search.model'
import { SearchService } from '@src/search/search.service'

@Resolver(() => SearchResultConnection)
export class SearchResolver {
  constructor(
    private readonly searchService: SearchService,
    private readonly transformService: TransformService,
  ) {}

  @Query(() => SearchResultConnection, { name: 'search' })
  @OptionalAuth()
  async search(@Args() args: SearchArgs): Promise<any> {
    const result = SearchArgsSchema.safeParse(args)
    if (!result.success) {
      throw BadRequestErr('Invalid search arguments')
    }
    const limit = args.limit ?? DEFAULT_PAGE_SIZE
    const offset = args.offset ?? 0
    const cursor = await this.searchService.searchAll(
      args.query,
      args.types,
      args.latlong,
      limit,
      offset,
      args.filters,
    )
    if (!cursor) {
      return {
        edges: [],
        nodes: [],
        totalCount: 0,
        pageInfo: {
          hasNextPage: false,
          hasPreviousPage: false,
        },
        _facets: [],
      }
    }
    // searchAll over-fetches by one to support end-of-results detection;
    // trim before handing to the offset transform so hasNextPage is accurate.
    const items = cursor.items.slice(0, limit)
    const paginated = await this.transformService.objectsToOffsetPaginated(
      SearchResultConnection,
      { items, count: cursor.count },
      { limit, offset },
    )
    return { ...paginated, _facets: cursor.facets ?? [] }
  }

  @ResolveField('facets', () => [SearchFacetResult])
  facets(
    @Parent() connection: SearchResultConnection,
    @Args('limit', { type: () => Int, nullable: true }) limit: number | undefined,
  ) {
    const cap = Math.min(limit ?? 10, 20)
    return (connection._facets ?? []).map((f) => ({
      ...f,
      counts: f.counts.slice(0, cap),
    }))
  }
}
