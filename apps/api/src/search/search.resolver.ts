import { Args, Query, Resolver } from '@nestjs/graphql'

import { OptionalAuth } from '@src/auth/decorators'
import { BadRequestErr } from '@src/common/exceptions'
import { TransformService } from '@src/common/transform'
import { DEFAULT_PAGE_SIZE } from '@src/graphql/paginated'
import { SearchArgs, SearchArgsSchema, SearchResultConnection } from '@src/search/search.model'
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
      }
    }
    // searchAll over-fetches by one to support end-of-results detection;
    // trim before handing to the offset transform so hasNextPage is accurate.
    const items = cursor.items.slice(0, limit)
    return this.transformService.objectsToOffsetPaginated(
      SearchResultConnection,
      { items, count: cursor.count },
      { limit, offset },
    )
  }
}
