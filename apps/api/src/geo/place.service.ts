import { ref } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { isUsingChange } from '@src/changes/change-ext.model'
import { Change } from '@src/changes/change.entity'
import { EditService } from '@src/changes/edit.service'
import { mapOrderBy } from '@src/common/db.utils'
import { NotFoundErr } from '@src/common/exceptions'
import { I18nService } from '@src/common/i18n.service'
import { CursorOptions } from '@src/common/transform'
import { generateID, IEntityService, IsEntityService, QueryField } from '@src/db/base.entity'
import { Point } from '@src/db/custom.types'
import { Place, PlacesTag } from '@src/geo/place.entity'
import { CreatePlaceInput, UpdatePlaceInput } from '@src/geo/place.model'
import { Tag } from '@src/process/tag.entity'
import { Org } from '@src/users/org.entity'

@Injectable()
@IsEntityService(Place)
export class PlaceService implements IEntityService<Place> {
  constructor(
    private readonly em: EntityManager,
    private readonly editService: EditService,
    private readonly i18n: I18nService,
  ) {}

  queryFields(): Record<string, QueryField> {
    return {
      org: { operators: ['SEARCH', 'EXACT'], dbField: 'org' },
    }
  }

  async find(opts: CursorOptions<Place>) {
    const places = await this.em.find(Place, opts.where, opts.options)
    const count = await this.em.count(Place, opts.where, { filters: opts.options.filters })
    return {
      items: places,
      count,
    }
  }

  async findOneByID(id: string) {
    return await this.em.findOne(Place, { id }, { populate: ['org', 'place_tags'] })
  }

  async findManyByID(ids: string[]) {
    return this.em.find(Place, { id: { $in: ids } })
  }

  async tags(placeID: string) {
    const tagDefs = await this.em.find(Tag, { places: placeID })
    const tags = await this.em.find(
      PlacesTag,
      { place: placeID },
      {
        orderBy: { tag: 'ASC' },
      },
    )
    const combinedTags = []
    for (const tag of tags) {
      const tagDef = tagDefs.find((t) => t.id === tag.tag.id)
      if (tagDef) {
        tagDef.meta = tag.meta
        combinedTags.push(tagDef)
      }
    }
    return combinedTags
  }

  async tagsPage(placeID: string, opts: CursorOptions<Tag>) {
    opts.where.places = this.em.getReference(Place, placeID)
    const tagDefs = await this.em.find(Tag, opts.where, opts.options)
    const tags = await this.em.find(
      PlacesTag,
      { place: placeID },
      {
        orderBy: mapOrderBy(opts.options.orderBy, { id: 'tag' }),
        limit: opts.options.limit,
      },
    )
    const combinedTags = []
    for (const tag of tags) {
      const tagDef = tagDefs.find((t) => t.id === tag.tag.id)
      if (tagDef) {
        tagDef.meta = tag.meta
        combinedTags.push(tagDef)
      }
    }
    const count = await this.em.count(PlacesTag, { place: opts.where.places })
    return {
      items: combinedTags,
      count,
    }
  }

  async org(placeID: string) {
    const place = await this.em.findOne(Place, { id: placeID }, { populate: ['org'] })
    if (place && place.org) {
      return place.org.load()
    }
    return null
  }

  async create(input: CreatePlaceInput, userID: string) {
    const place = new Place()
    place.id = generateID()
    if (!isUsingChange(input)) {
      this.editService.assertDirectCreateAllowed()
      await this.setFields(place, input)
      await this.editService.createHistory(
        Place.name,
        userID,
        undefined,
        this.editService.entityToChangePOJO(Place.name, place),
      )
      await this.em.persist(place).flush()
      return { place, change: null }
    }
    const change = await this.editService.findOneOrCreate(input.changeID, input.change, userID)
    await this.setFields(place, input, change)
    await this.editService.createEntityEdit(change, place)
    await this.editService.persistChange(change)
    await this.editService.checkMerge(change, input)
    return { place, change }
  }

  async update(input: UpdatePlaceInput, userID: string) {
    const { entity: place, change } = await this.editService.findOneWithChangeInput(
      input,
      userID,
      Place,
      { id: input.id },
      { populate: ['tags', 'place_tags'] },
    )
    if (!place) {
      throw NotFoundErr('PLACE_NOT_FOUND', `Place with id ${input.id} not found`)
    }
    if (!change) {
      const original = this.editService.entityToChangePOJO(Place.name, place)
      await this.setFields(place, input)
      await this.editService.createHistory(
        Place.name,
        userID,
        original,
        this.editService.entityToChangePOJO(Place.name, place),
      )
      await this.em.persist(place).flush()
      return { place, change: null }
    }
    await this.editService.beginUpdateEntityEdit(change, place)
    await this.setFields(place, input, change)
    await this.editService.updateEntityEdit(change, place)
    const currentPlace = await this.editService.findOneForChange(this.em, change, Place, {
      id: input.id,
    })
    await this.editService.persistChange(change)
    await this.editService.checkMerge(change, input)
    return { place, change, currentPlace: currentPlace ?? undefined }
  }

  async setFields(
    place: Place,
    input: Partial<CreatePlaceInput & UpdatePlaceInput>,
    change?: Change,
  ) {
    if (input.name) {
      place.name = this.i18n.addTrReq(place.name, input.name, input.lang)
    }
    if (input.nameTr) {
      place.name = this.i18n.addTrReq(place.name, input.nameTr, input.lang)
    }
    if (input.desc) {
      place.desc = this.i18n.addTr(place.desc, input.desc, input.lang)
    }
    if (input.descTr) {
      place.desc = this.i18n.addTr(place.desc, input.descTr, input.lang)
    }
    if (input.address) {
      place.address = this.i18n.addTr(place.address, input.address, input.lang)
    }
    if (input.addressTr) {
      place.address = this.i18n.addTr(place.address, input.addressTr, input.lang)
    }
    if (input.location) {
      place.location = new Point(input.location.latitude, input.location.longitude)
    }
    if (input.org) {
      place.org = ref(Org, input.org.id)
    }
    if (input.tags || input.addTags) {
      place.place_tags = await this.editService.setOrAddPivot(
        place.id,
        change,
        place.place_tags,
        Place,
        PlacesTag,
        input.tags,
        input.addTags,
      )
    }
    if (input.removeTags) {
      place.place_tags = await this.editService.removeFromPivot(
        change,
        place.place_tags,
        Place,
        PlacesTag,
        input.removeTags,
      )
    }
  }
}
