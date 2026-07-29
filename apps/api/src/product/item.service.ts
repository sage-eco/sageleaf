import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { DeleteInput, isUsingChange } from '@src/changes/change-ext.model'
import { Change } from '@src/changes/change.entity'
import { EditService } from '@src/changes/edit.service'
import { mapOrderBy } from '@src/common/db.utils'
import { NotFoundErr } from '@src/common/exceptions'
import { I18nService } from '@src/common/i18n.service'
import { CursorOptions } from '@src/common/transform'
import { IEntityService, IsEntityService, QueryField } from '@src/db/base.entity'
import { LocationService } from '@src/geo/location.service'
import { Component } from '@src/process/component.entity'
import { Process, ProcessIntent } from '@src/process/process.entity'
import { StreamScore, StreamScoreRating } from '@src/process/stream.model'
import { StreamService } from '@src/process/stream.service'
import { Tag } from '@src/process/tag.entity'
import { TagService } from '@src/process/tag.service'
import { Category } from '@src/product/category.entity'
import { Item, ItemHistory, ItemsCategories, ItemsTags } from '@src/product/item.entity'
import {
  CreateItemInput,
  ItemRecycle,
  ItemReduce,
  ItemReuse,
  UpdateItemInput,
} from '@src/product/item.model'
import { Variant } from '@src/product/variant.entity'

@Injectable()
@IsEntityService(Item)
export class ItemService implements IEntityService<Item> {
  constructor(
    private readonly em: EntityManager,
    private readonly editService: EditService,
    private readonly tagService: TagService,
    private readonly i18n: I18nService,
    private readonly streamService: StreamService,
    private readonly locationService: LocationService,
  ) {}

  queryFields(): Record<string, QueryField> {
    return {}
  }

  async findOneByID(id: string) {
    return await this.em.findOne(Item, { id }, { populate: ['itemCategories', 'itemTags'] })
  }

  async findManyByID(ids: string[]) {
    return this.em.find(Item, { id: { $in: ids } }, { populate: ['itemCategories', 'itemTags'] })
  }

  async find(opts: CursorOptions<Item>) {
    opts.options.populate = ['itemCategories', 'itemTags']
    const [items, count] = await this.em.findAndCount(Item, opts.where, opts.options)
    return {
      items,
      count,
    }
  }

  async categories(itemID: string, opts: CursorOptions<Category>) {
    opts.where.items = this.em.getReference(Item, itemID)
    const categories = await this.em.find(Category, opts.where, opts.options)
    const count = await this.em.count(Category, { items: opts.where.items })
    return {
      items: categories,
      count,
    }
  }

  async tagsList(itemID: string) {
    const tagDefs = await this.em.find(Tag, { items: itemID })
    const tags = await this.em.find(
      ItemsTags,
      { item: itemID },
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

  async tags(itemID: string, opts: CursorOptions<Tag>) {
    opts.where.items = this.em.getReference(Item, itemID)
    const tagDefs = await this.em.find(Tag, opts.where, opts.options)
    const tags = await this.em.find(
      ItemsTags,
      { item: itemID },
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
    const count = await this.em.count(ItemsTags, { item: opts.where.items })
    return {
      items: combinedTags,
      count,
    }
  }

  async variants(itemID: string, opts: CursorOptions<Variant>) {
    opts.where.items = this.em.getReference(Item, itemID)
    const variants = await this.em.find(Variant, opts.where, opts.options)
    const count = await this.em.count(Variant, { items: opts.where.items })
    return {
      items: variants,
      count,
    }
  }

  async componentsByIds(ids: string[], opts: CursorOptions<Component>) {
    if (ids.length === 0) return { items: [], count: 0 }
    opts.where.id = { $in: ids }
    const items = await this.em.find(Component, opts.where, opts.options)
    const count = await this.em.count(Component, { id: { $in: ids } })
    return { items, count }
  }

  async variantsByIds(ids: string[], opts: CursorOptions<Variant>) {
    if (ids.length === 0) return { items: [], count: 0 }
    opts.where.id = { $in: ids }
    const items = await this.em.find(Variant, opts.where, opts.options)
    const count = await this.em.count(Variant, { id: { $in: ids } })
    return { items, count }
  }

  private async fetchVariantsForItem(itemID: string, populate: string[]) {
    return this.em.find(
      Variant,
      { items: this.em.getReference(Item, itemID) },
      { populate: populate as any, limit: 10 },
    )
  }

  async recycleScore(itemID: string, regionID?: string) {
    return this.computeItemScore(itemID, regionID, (id, rid) =>
      this.streamService.recycleComponentScore(id, rid),
    )
  }

  async reduceScore(itemID: string, regionID?: string) {
    return this.computeItemScore(itemID, regionID, (id, rid) =>
      this.streamService.reduceComponentScore(id, rid),
    )
  }

  async reuseScore(itemID: string, regionID?: string) {
    return this.computeItemScore(itemID, regionID, (id, rid) =>
      this.streamService.reuseComponentScore(id, rid),
    )
  }

  private async computeItemScore(
    itemID: string,
    regionID: string | undefined,
    scoreFunc: (componentId: string, regionID?: string) => Promise<StreamScore | null>,
  ) {
    const regionSearch = await this.locationService.resolveLocation(regionID)
    if (!regionSearch || regionSearch.length === 0) {
      return null
    }

    const variants = await this.fetchVariantsForItem(itemID, ['components'])
    if (variants.length === 0) {
      return null
    }

    const variantScores: number[] = []
    for (const variant of variants) {
      const components = variant.components.getItems()
      if (components.length === 0) continue

      let totalScore = 0
      let scoredCount = 0
      for (const component of components) {
        const score = await scoreFunc(component.id, regionID)
        if (score?.score != null) {
          totalScore += score.score
          scoredCount++
        }
      }
      if (scoredCount > 0) {
        variantScores.push(totalScore / scoredCount)
      }
    }

    if (variantScores.length === 0) {
      return new StreamScore()
    }

    const itemScore = new StreamScore()
    itemScore.score = Math.floor(
      variantScores.reduce((sum, s) => sum + s, 0) / variantScores.length,
    )
    itemScore.rating = StreamScoreRating.A
    itemScore.ratingF = this.i18n.t(`stream.scoreRating.${itemScore.rating}`)
    return itemScore
  }

  async recycle(itemID: string, regionID?: string): Promise<ItemRecycle[]> {
    return this.buildItemStreams(
      itemID,
      regionID,
      [ProcessIntent.RECYCLE, ProcessIntent.ENERGY_RECOVERY, ProcessIntent.LANDFILL],
      (process, componentIds, variantIds, stream) => {
        const r = new ItemRecycle()
        r.itemId = itemID
        r.regionID = regionID
        r.componentIds = componentIds
        r.variantIds = variantIds
        r.stream = stream
        r.context = []
        return r
      },
    )
  }

  async reduce(itemID: string, regionID?: string): Promise<ItemReduce[]> {
    return this.buildItemStreams(
      itemID,
      regionID,
      [ProcessIntent.REDUCE],
      (process, componentIds, variantIds) => {
        const r = new ItemReduce()
        r.itemId = itemID
        r.regionID = regionID
        r.componentIds = componentIds
        r.variantIds = variantIds
        r.stream = this.streamService.buildReduceStream(process)
        r.context = []
        return r
      },
    )
  }

  async reuse(itemID: string, regionID?: string): Promise<ItemReuse[]> {
    return this.buildItemStreams(
      itemID,
      regionID,
      [
        ProcessIntent.REUSE,
        ProcessIntent.REPAIR,
        ProcessIntent.REFURBISH,
        ProcessIntent.REMANUFACTURE,
        ProcessIntent.REPURPOSE,
      ],
      (process, componentIds, variantIds) => {
        const r = new ItemReuse()
        r.itemId = itemID
        r.regionID = regionID
        r.componentIds = componentIds
        r.variantIds = variantIds
        r.stream = this.streamService.buildReuseStream(process)
        r.context = []
        return r
      },
    )
  }

  private async buildItemStreams<T>(
    itemID: string,
    regionID: string | undefined,
    intents: ProcessIntent[],
    build: (
      process: Process,
      componentIds: string[],
      variantIds: string[],
      stream: ReturnType<typeof this.streamService.buildStream>,
    ) => T,
  ): Promise<T[]> {
    const regionSearch = await this.locationService.resolveLocation(regionID)
    if (!regionSearch?.length) return []

    const variants = await this.fetchVariantsForItem(itemID, ['components'])
    if (variants.length === 0) return []

    const processMap = new Map<
      string,
      {
        process: Process
        componentIds: string[]
        components: Component[]
        variantIds: string[]
      }
    >()

    for (const variant of variants) {
      for (const component of variant.components.getItems()) {
        const matches = await this.streamService.findProcessesForComponent(
          component.id,
          regionID,
          intents,
        )
        for (const { process, component: comp } of matches) {
          if (!processMap.has(process.id)) {
            processMap.set(process.id, {
              process,
              componentIds: [],
              components: [],
              variantIds: [],
            })
          }
          const entry = processMap.get(process.id)!
          if (!entry.componentIds.includes(comp.id)) {
            entry.componentIds.push(comp.id)
            entry.components.push(comp)
          }
        }
      }
    }

    // Variant-specific processes
    const variantIds = variants.map((v) => v.id)
    const variantProcesses = await this.em.find(Process, {
      variant: { id: { $in: variantIds } },
      region: { id: { $in: regionSearch } },
      intent: { $in: intents },
    })
    for (const process of variantProcesses) {
      const matchingVariant = variants.find((v) => {
        const ref = (process as any).variant
        const vid = ref?.id ?? ref
        return vid === v.id
      })
      if (!processMap.has(process.id)) {
        processMap.set(process.id, {
          process,
          componentIds: matchingVariant
            ? matchingVariant.components.getItems().map((c) => c.id)
            : [],
          components: matchingVariant ? matchingVariant.components.getItems() : [],
          variantIds: [],
        })
      }
      const entry = processMap.get(process.id)!
      if (matchingVariant && !entry.variantIds.includes(matchingVariant.id)) {
        entry.variantIds.push(matchingVariant.id)
      }
    }

    const result: T[] = []
    for (const { process, componentIds, components, variantIds: vIds } of processMap.values()) {
      result.push(
        build(process, componentIds, vIds, this.streamService.buildStream(process, components)),
      )
    }
    return result
  }

  async create(input: CreateItemInput, userID: string) {
    const item = new Item()
    if (!isUsingChange(input)) {
      this.editService.assertDirectCreateAllowed()
      await this.setFields(item, input)
      await this.editService.createHistory(
        Item.name,
        userID,
        undefined,
        this.editService.entityToChangePOJO(Item.name, item),
      )
      await this.em.persist(item).flush()
      return { item }
    }
    const change = await this.editService.findOneOrCreate(input.changeID, input.change, userID)
    await this.setFields(item, input, change)
    await this.editService.createEntityEdit(change, item)
    await this.editService.persistChange(change)
    await this.editService.checkMerge(change, input)
    return { item, change }
  }

  async update(input: UpdateItemInput, userID: string) {
    const { entity: item, change } = await this.editService.findOneWithChangeInput(
      input,
      userID,
      Item,
      {
        id: input.id,
      },
      { populate: ['itemCategories', 'tags', 'itemTags'] },
    )
    if (!item) {
      throw new Error('Item not found')
    }
    if (!change) {
      const original = this.editService.entityToChangePOJO(Item.name, item)
      await this.setFields(item, input)
      await this.editService.createHistory(
        Item.name,
        userID,
        original,
        this.editService.entityToChangePOJO(Item.name, item),
      )
      await this.em.persist(item).flush()
      return { item }
    }
    await this.editService.beginUpdateEntityEdit(change, item)
    await this.setFields(item, input, change)
    await this.editService.updateEntityEdit(change, item)
    const currentItem = await this.editService.findOneForChange(this.em, change, Item, {
      id: input.id,
    })
    await this.editService.persistChange(change)
    await this.editService.checkMerge(change, input)
    return { item, change, currentItem: currentItem ?? undefined }
  }

  async delete(input: DeleteInput) {
    const deleted = await this.editService.deleteOneWithChange(input, Item)
    if (!deleted) {
      throw NotFoundErr(`Item with ID "${input.id}" not found`)
    }
    return deleted
  }

  async history(itemID: string, opts: CursorOptions<ItemHistory>) {
    const items = await this.em.find(
      ItemHistory,
      { item: itemID },
      {
        populate: ['user'],
        orderBy: { datetime: 'ASC' },
        limit: opts.options.limit,
        offset: opts.options.offset,
      },
    )
    const count = await this.em.count(ItemHistory, { item: itemID })
    return { items, count }
  }

  async setFields(item: Item, input: Partial<CreateItemInput & UpdateItemInput>, change?: Change) {
    if (input.name) {
      item.name = this.i18n.addTrReq(item.name, input.name, input.lang)
    }
    if (input.nameTr) {
      item.name = this.i18n.addTrReq(item.name, input.nameTr, input.lang)
    }
    if (input.desc) {
      item.desc = this.i18n.addTr(item.desc, input.desc, input.lang)
    }
    if (input.descTr) {
      item.desc = this.i18n.addTr(item.desc, input.descTr, input.lang)
    }
    if (input.imageURL) {
      if (!item.files) {
        item.files = {}
      }
      item.files.thumbnail = input.imageURL
    }
    if (!item.source) {
      item.source = {}
    }
    if (input.categories || input.addCategories) {
      item.itemCategories = await this.editService.setOrAddPivot(
        item.id,
        change,
        item.itemCategories,
        Item,
        ItemsCategories,
        input.categories,
        input.addCategories,
      )
    }
    if (input.removeCategories) {
      item.itemCategories = await this.editService.removeFromPivot(
        change,
        item.itemCategories,
        Item,
        ItemsCategories,
        input.removeCategories,
      )
    }
    if (input.tags || input.addTags) {
      for (const tag of input.tags || input.addTags || []) {
        if (change) {
          await this.editService.findRefWithChange(change, Tag, { id: tag.id })
        }
        const tagEntity = this.em.getReference(Tag, tag.id)
        const tagDef = await this.tagService.validateTagInput(tag)
        const tagInst = new ItemsTags()
        tagInst.tag = tagEntity
        tagInst.item = item
        tagInst.meta = tagDef.meta
        if (input.tags) {
          item.itemTags.set([])
        }
        if (item.itemTags.contains(tagInst)) {
          item.itemTags.remove(tagInst)
        }
        item.itemTags.add(tagInst)
      }
    }
    if (input.removeTags) {
      item.tags = await this.editService.removeFromCollection(
        item.tags,
        Tag,
        input.removeTags,
        change,
      )
    }
  }
}
