import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { AuthUser, type ReqUser } from '@src/auth/auth.guard'
import { OptionalAuth } from '@src/auth/decorators'
import { Change } from '@src/changes/change.model'
import { TrackEntityView } from '@src/common/entity-view.decorator'
import { NotFoundErr } from '@src/common/exceptions'
import { TransformService } from '@src/common/transform'
import { Place as PlaceEntity } from '@src/geo/place.entity'
import {
  CreatePlaceInput,
  CreatePlaceOutput,
  Place,
  PlacesArgs,
  PlacesConnection,
  PlaceTagsArgs,
  UpdatePlaceInput,
  UpdatePlaceOutput,
} from '@src/geo/place.model'
import { PlaceSchemaService } from '@src/geo/place.schema'
import { PlaceService } from '@src/geo/place.service'
import { ModelEditSchema } from '@src/graphql/base.model'
import { Tag, TagConnection } from '@src/process/tag.model'
import { RelatedArgs } from '@src/search/related.model'
import { SearchIndex } from '@src/search/search.backend'
import { SearchService } from '@src/search/search.service'
import { Org } from '@src/users/org.model'

@Resolver(() => Place)
export class PlaceResolver {
  constructor(
    private readonly placeService: PlaceService,
    private readonly transform: TransformService,
    private readonly placeSchemaService: PlaceSchemaService,
    private readonly searchService: SearchService,
  ) {}

  @Query(() => ModelEditSchema, { nullable: true })
  @OptionalAuth()
  async placeSchema(): Promise<ModelEditSchema> {
    return {
      model: 'Place',
      create: {
        schema: this.placeSchemaService.CreateJSONSchema,
        uischema: this.placeSchemaService.CreateUISchema,
      },
      update: {
        schema: this.placeSchemaService.UpdateJSONSchema,
        uischema: this.placeSchemaService.UpdateUISchema,
      },
    }
  }

  @Query(() => PlacesConnection, { name: 'places' })
  @OptionalAuth()
  async places(@Args() args: PlacesArgs): Promise<PlacesConnection> {
    const [parsedArgs, filter] = await this.transform.paginationArgs(PlacesArgs, args)
    const cursorOpts = await this.transform.applySearchQuery(
      PlaceEntity,
      filter,
      this.placeService.queryFields(),
      parsedArgs,
    )

    const cursor = await this.placeService.find(cursorOpts)
    return this.transform.entityToPaginated(Place, PlacesConnection, cursor, parsedArgs)
  }

  @Query(() => Place, { name: 'place', nullable: true })
  @OptionalAuth()
  @TrackEntityView('place')
  async place(@Args('id', { type: () => ID }) id: string): Promise<Place> {
    const place = await this.placeService.findOneByID(id)
    if (!place) {
      throw NotFoundErr('Place not found')
    }
    return this.transform.entityToModel(Place, place)
  }

  @ResolveField(() => TagConnection)
  async tags(@Parent() place: Place, @Args() args: PlaceTagsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(PlaceTagsArgs, args)
    const cursor = await this.placeService.tagsPage(place.id, filter)
    return this.transform.entityToPaginated(Tag, TagConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async org(@Parent() place: Place) {
    const org = await this.placeService.org(place.id)
    if (!org) {
      return null
    }
    return this.transform.entityToModel(Org, org)
  }

  @ResolveField(() => PlacesConnection)
  async related(@Parent() place: Place, @Args() args: RelatedArgs) {
    const parsedArgs = await this.searchService.parseRelatedArgs(args)
    const cursor = await this.searchService.searchRelated(
      SearchIndex.PLACES,
      place.id,
      parsedArgs.query,
      parsedArgs.limit,
      parsedArgs.offset,
    )
    return this.transform.entitiesToOffsetPaginated(Place, PlacesConnection, cursor, parsedArgs)
  }

  @Mutation(() => CreatePlaceOutput, { nullable: true })
  async createPlace(
    @Args('input') input: CreatePlaceInput,
    @AuthUser() user: ReqUser,
  ): Promise<CreatePlaceOutput> {
    input = await this.placeSchemaService.parseCreateInput(input)
    const created = await this.placeService.create(input, user.id)
    const model = await this.transform.entityToModel(Place, created.place)
    if (created.change) {
      const change = await this.transform.entityToModel(Change, created.change)
      return { place: model, change }
    }
    return { place: model }
  }

  @Mutation(() => UpdatePlaceOutput, { nullable: true })
  async updatePlace(
    @Args('input') input: UpdatePlaceInput,
    @AuthUser() user: ReqUser,
  ): Promise<UpdatePlaceOutput> {
    input = await this.placeSchemaService.parseUpdateInput(input)
    const updated = await this.placeService.update(input, user.id)
    const model = await this.transform.entityToModel(Place, updated.place)
    if (updated.change) {
      const change = await this.transform.entityToModel(Change, updated.change)
      const currentPlace = updated.currentPlace
        ? await this.transform.entityToModel(Place, updated.currentPlace)
        : undefined
      return { place: model, change, currentPlace }
    }
    return { place: model }
  }
}
