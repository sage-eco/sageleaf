import { EntityManager, raw, ref } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { DeleteInput, isUsingChange } from '@src/changes/change-ext.model'
import { Change } from '@src/changes/change.entity'
import { EditService } from '@src/changes/edit.service'
import { Source, SourceType } from '@src/changes/source.entity'
import { mapOrderBy } from '@src/common/db.utils'
import { NotFoundErr } from '@src/common/exceptions'
import { I18nService } from '@src/common/i18n.service'
import { CursorOptions } from '@src/common/transform'
import { IEntityService, IsEntityService, QueryField } from '@src/db/base.entity'
import { LocationService } from '@src/geo/location.service'
import { Region } from '@src/geo/region.entity'
import { Component } from '@src/process/component.entity'
import { Process, ProcessIntent } from '@src/process/process.entity'
import { StreamScore, StreamScoreRating } from '@src/process/stream.model'
import { StreamService } from '@src/process/stream.service'
import { Tag } from '@src/process/tag.entity'
import { TagService } from '@src/process/tag.service'
import { Item } from '@src/product/item.entity'
import {
  Variant,
  VariantHistory,
  VariantsComponents,
  VariantsItems,
  VariantsOrgs,
  VariantsSources,
  VariantsTags,
} from '@src/product/variant.entity'
import {
  CreateVariantInput,
  UpdateVariantInput,
  VariantRecycle,
  VariantReduce,
  VariantReuse,
} from '@src/product/variant.model'

@Injectable()
@IsEntityService(Variant)
export class VariantService implements IEntityService<Variant> {
  constructor(
    private readonly em: EntityManager,
    private readonly editService: EditService,
    private readonly tagService: TagService,
    private readonly streamService: StreamService,
    private readonly i18n: I18nService,
    private readonly locationService: LocationService,
  ) {}

  queryFields(): Record<string, QueryField> {
    return {}
  }

  async findOneByID(id: string) {
    return await this.em.findOne(
      Variant,
      { id },
      {
        populate: [
          'variantSources',
          'variantItems',
          'variantTags',
          'variantComponents',
          'variantOrgs',
          'orgs',
        ],
      },
    )
  }

  async findManyByID(ids: string[]) {
    return this.em.find(Variant, { id: { $in: ids } })
  }

  async find(opts: CursorOptions<Variant>) {
    if (opts.where.region && typeof opts.where.region === 'string') {
      const regionSearch = await this.locationService.resolveLocation(opts.where.region)
      if (regionSearch) {
        opts.where.region = { $in: regionSearch }
      }
    }
    const variants = await this.em.find(Variant, opts.where, opts.options)
    const count = await this.em.count(Variant, opts.where)
    return {
      items: variants,
      count,
    }
  }

  async items(variantID: string, opts: CursorOptions<Item>) {
    opts.where.variants = this.em.getReference(Variant, variantID)
    const items = await this.em.find(Item, opts.where, opts.options)
    const count = await this.em.count(Item, { variants: opts.where.variants })
    return {
      items,
      count,
    }
  }

  async processes(variantID: string, opts: CursorOptions<Process>) {
    opts.where.variant = variantID
    const items = await this.em.find(Process, opts.where, opts.options)
    const count = await this.em.count(Process, opts.where)
    return {
      items,
      count,
    }
  }

  async orgs(variantID: string, opts: CursorOptions<VariantsOrgs>) {
    opts.where.variant = this.em.getReference(Variant, variantID)
    opts.options.populate = ['org']
    const orgs = await this.em.find(VariantsOrgs, opts.where, opts.options)
    const count = await this.em.count(VariantsOrgs, {
      variant: opts.where.variant,
    })
    return {
      items: orgs,
      count,
    }
  }

  async tags(variantID: string, opts: CursorOptions<Tag>) {
    opts.where.variants = this.em.getReference(Variant, variantID)
    const tagDefs = await this.em.find(Tag, opts.where, opts.options)
    const tags = await this.em.find(
      VariantsTags,
      { variant: variantID },
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
    const count = await this.em.count(VariantsTags, {
      variant: opts.where.variants,
    })
    return {
      items: combinedTags,
      count,
    }
  }

  async components(variantID: string, opts: CursorOptions<VariantsComponents>) {
    opts.where.variant = this.em.getReference(Variant, variantID)
    opts.options.populate = ['component']
    const components = await this.em.find(VariantsComponents, opts.where, opts.options)
    const count = await this.em.count(VariantsComponents, {
      variant: opts.where.variant,
    })
    return {
      items: components,
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

  async recycleScore(variantID: string, regionID?: string) {
    return this.computeVariantScore(variantID, regionID, (id, rid) =>
      this.streamService.recycleComponentScore(id, rid),
    )
  }

  async reduceScore(variantID: string, regionID?: string) {
    return this.computeVariantScore(variantID, regionID, (id, rid) =>
      this.streamService.reduceComponentScore(id, rid),
    )
  }

  async reuseScore(variantID: string, regionID?: string) {
    return this.computeVariantScore(variantID, regionID, (id, rid) =>
      this.streamService.reuseComponentScore(id, rid),
    )
  }

  private async computeVariantScore(
    variantID: string,
    regionID: string | undefined,
    scoreFunc: (componentId: string, regionID?: string) => Promise<StreamScore | null>,
  ) {
    const variant = await this.em.findOne(
      Variant,
      { id: variantID },
      { populate: ['region', 'components'] },
    )
    if (!variant) {
      throw new Error(`Variant with ID "${variantID}" not found`)
    }
    const regionSearch = await this.locationService.resolveLocation(regionID)
    if (!regionSearch || regionSearch.length === 0) {
      return null
    }
    if (variant.components.getItems().length === 0) {
      return new StreamScore()
    }
    let totalScore = 0
    for (const component of variant.components.getItems()) {
      const score = await scoreFunc(component.id, regionID)
      if (score && score.score) {
        totalScore += score.score
      }
    }
    const variantScore = new StreamScore()
    variantScore.score = Math.floor(totalScore / variant.components.getItems().length)
    variantScore.rating = StreamScoreRating.A
    variantScore.ratingF = this.i18n.t(`stream.scoreRating.${variantScore.rating}`)
    return variantScore
  }

  async recycle(variantID: string, regionID?: string): Promise<VariantRecycle[]> {
    return this.buildVariantStreams(
      variantID,
      regionID,
      [ProcessIntent.RECYCLE, ProcessIntent.ENERGY_RECOVERY, ProcessIntent.LANDFILL],
      (process, componentIds, stream) => {
        const r = new VariantRecycle()
        r.variantId = variantID
        r.regionID = regionID
        r.componentIds = componentIds
        r.stream = stream
        r.context = []
        return r
      },
    )
  }

  async reduce(variantID: string, regionID?: string): Promise<VariantReduce[]> {
    return this.buildVariantStreams(
      variantID,
      regionID,
      [ProcessIntent.REDUCE],
      (process, componentIds, _stream) => {
        const r = new VariantReduce()
        r.variantId = variantID
        r.regionID = regionID
        r.componentIds = componentIds
        r.stream = this.streamService.buildReduceStream(process)
        r.context = []
        return r
      },
    )
  }

  async reuse(variantID: string, regionID?: string): Promise<VariantReuse[]> {
    return this.buildVariantStreams(
      variantID,
      regionID,
      [
        ProcessIntent.REUSE,
        ProcessIntent.REPAIR,
        ProcessIntent.REFURBISH,
        ProcessIntent.REMANUFACTURE,
        ProcessIntent.REPURPOSE,
      ],
      (process, componentIds, _stream) => {
        const r = new VariantReuse()
        r.variantId = variantID
        r.regionID = regionID
        r.componentIds = componentIds
        r.stream = this.streamService.buildReuseStream(process)
        r.context = []
        return r
      },
    )
  }

  private async buildVariantStreams<T>(
    variantID: string,
    regionID: string | undefined,
    intents: ProcessIntent[],
    build: (
      process: Process,
      componentIds: string[],
      stream: ReturnType<typeof this.streamService.buildStream>,
    ) => T,
  ): Promise<T[]> {
    const regionSearch = await this.locationService.resolveLocation(regionID)
    if (!regionSearch?.length) return []

    const variant = await this.em.findOne(Variant, { id: variantID }, { populate: ['components'] })
    if (!variant) return []

    const processMap = new Map<
      string,
      { process: Process; componentIds: string[]; components: Component[] }
    >()

    for (const component of variant.components.getItems()) {
      const matches = await this.streamService.findProcessesForComponent(
        component.id,
        regionID,
        intents,
      )
      for (const { process, component: comp } of matches) {
        if (!processMap.has(process.id)) {
          processMap.set(process.id, { process, componentIds: [], components: [] })
        }
        const entry = processMap.get(process.id)!
        if (!entry.componentIds.includes(comp.id)) {
          entry.componentIds.push(comp.id)
          entry.components.push(comp)
        }
      }
    }

    // Variant-specific processes apply to the whole variant
    const variantProcesses = await this.em.find(Process, {
      variant: variantID,
      region: { id: { $in: regionSearch } },
      intent: { $in: intents },
    })
    const allComponentIds = variant.components.getItems().map((c) => c.id)
    const allComponents = variant.components.getItems()
    for (const process of variantProcesses) {
      if (!processMap.has(process.id)) {
        processMap.set(process.id, {
          process,
          componentIds: allComponentIds,
          components: allComponents,
        })
      }
    }

    const result: T[] = []
    for (const { process, componentIds, components } of processMap.values()) {
      result.push(build(process, componentIds, this.streamService.buildStream(process, components)))
    }
    return result
  }

  async create(input: CreateVariantInput, userID: string) {
    const variant = new Variant()
    if (!isUsingChange(input)) {
      this.editService.assertDirectCreateAllowed()
      await this.setFields(variant, input)
      await this.editService.createHistory(
        Variant.name,
        userID,
        undefined,
        this.editService.entityToChangePOJO(Variant.name, variant),
      )
      await this.em.persist(variant).flush()
      return { variant }
    }
    const change = await this.editService.findOneOrCreate(input.changeID, input.change, userID)
    await this.setFields(variant, input, change)
    await this.editService.createEntityEdit(change, variant)
    await this.editService.persistChange(change)
    await this.editService.checkMerge(change, input)
    return { variant, change }
  }

  async update(input: UpdateVariantInput, userID: string) {
    const { entity: variant, change } = await this.editService.findOneWithChangeInput(
      input,
      userID,
      Variant,
      {
        id: input.id,
      },
      {
        populate: [
          'items',
          'variantItems',
          'components',
          'variantComponents',
          'tags',
          'variantTags',
          'orgs',
          'variantOrgs',
          'sources',
          'variantSources',
        ],
      },
    )
    if (!variant) {
      throw new Error('Variant not found')
    }
    if (!change) {
      const original = this.editService.entityToChangePOJO(Variant.name, variant)
      await this.setFields(variant, input)
      await this.editService.createHistory(
        Variant.name,
        userID,
        original,
        this.editService.entityToChangePOJO(Variant.name, variant),
      )
      await this.em.persist(variant).flush()
      return { variant }
    }
    await this.editService.beginUpdateEntityEdit(change, variant)
    await this.setFields(variant, input, change)
    await this.editService.updateEntityEdit(change, variant)
    const currentVariant = await this.editService.findOneForChange(this.em, change, Variant, {
      id: input.id,
    })
    await this.editService.persistChange(change)
    await this.editService.checkMerge(change, input)
    return { variant, change, currentVariant: currentVariant ?? undefined }
  }

  async delete(input: DeleteInput) {
    const deleted = await this.editService.deleteOneWithChange(input, Variant)
    if (!deleted) {
      throw NotFoundErr(`Variant with ID "${input.id}" not found`)
    }
    return deleted
  }

  async images(variantID: string, opts: CursorOptions<VariantsSources>) {
    opts.where.variant = this.em.getReference(Variant, variantID)
    opts.where.source = { type: SourceType.IMAGE }
    opts.options.populate = ['source']
    opts.options.orderBy = [{ [raw("(meta->>'order')::int")]: 'ASC NULLS LAST' }]
    const variantSources = await this.em.find(VariantsSources, opts.where, opts.options)
    const count = await this.em.count(VariantsSources, {
      variant: opts.where.variant,
      source: { type: SourceType.IMAGE },
    })
    return { items: variantSources.map((vs) => vs.source), count }
  }

  async sources(variantID: string, opts: CursorOptions<VariantsSources>) {
    opts.where.variant = this.em.getReference(Variant, variantID)
    opts.options.populate = ['source']
    const items = await this.em.find(VariantsSources, opts.where, opts.options)
    const count = await this.em.count(VariantsSources, { variant: opts.where.variant })
    return { items, count }
  }

  async regions(variantID: string, opts: CursorOptions<Region>) {
    const variant = await this.em.findOne(Variant, { id: variantID }, { populate: ['region'] })
    if (!variant) return { items: [], count: 0 }
    const ids = new Set<string>(variant.regions ?? [])
    if (variant.region?.id) ids.add(String(variant.region.id))
    if (ids.size === 0) return { items: [], count: 0 }
    Object.assign(opts.where, { id: { $in: [...ids] } })
    const items = await this.em.find(Region, opts.where, opts.options)
    const count = await this.em.count(Region, { id: { $in: [...ids] } })
    return { items, count }
  }

  async history(variantID: string, opts: CursorOptions<VariantHistory>) {
    const items = await this.em.find(
      VariantHistory,
      { variant: variantID },
      {
        populate: ['user'],
        orderBy: { datetime: 'ASC' },
        limit: opts.options.limit,
        offset: opts.options.offset,
      },
    )
    const count = await this.em.count(VariantHistory, { variant: variantID })
    return { items, count }
  }

  async setFields(
    variant: Variant,
    input: Partial<CreateVariantInput & UpdateVariantInput>,
    change?: Change,
  ) {
    if (input.name) {
      variant.name = this.i18n.addTrReq(variant.name, input.name, input.lang)
    }
    if (input.nameTr) {
      variant.name = this.i18n.addTrReq(variant.name, input.nameTr, input.lang)
    }
    if (input.desc) {
      variant.desc = this.i18n.addTr(variant.desc, input.desc, input.lang)
    }
    if (input.descTr) {
      variant.desc = this.i18n.addTr(variant.desc, input.descTr, input.lang)
    }
    if (input.code) {
      variant.code = input.code
    }
    if (!change && input.addSources) {
      for (const source of input.addSources) {
        const sourceEntity = await this.em.findOne(Source, { id: source.id })
        if (!sourceEntity) throw NotFoundErr(`Source with ID "${source.id}" not found`)
        const existing = variant.variantSources.find((vs) => vs.source.id === source.id)
        if (existing) {
          existing.meta = source.meta
          this.em.persist(existing)
        } else {
          const pivot = new VariantsSources()
          pivot.variant = variant
          pivot.source = sourceEntity
          pivot.meta = source.meta
          this.em.persist(pivot)
        }
      }
    }
    if (!change && input.removeSources) {
      for (const sourceId of input.removeSources) {
        const existing = variant.variantSources.find((vs) => vs.source.id === sourceId)
        if (existing) {
          this.em.remove(existing)
        }
      }
    }
    if (input.items || input.addItems) {
      variant.variantItems = await this.editService.setOrAddPivot(
        variant.id,
        change,
        variant.variantItems,
        Variant,
        VariantsItems,
        input.items?.map((i) => ({ id: i.id })),
        input.addItems?.map((i) => ({ id: i.id })),
      )
    }
    if (input.removeItems) {
      variant.variantItems = await this.editService.removeFromPivot(
        change,
        variant.variantItems,
        Variant,
        VariantsItems,
        input.removeItems,
      )
    }
    if (input.regions) {
      variant.regions = []
      for (const region of input.regions) {
        const regionEntity = await this.em.findOne(Region, { id: region.id })
        if (!regionEntity) throw NotFoundErr(`Region with ID "${region.id}" not found`)
        if (!variant.regions.includes(regionEntity.id)) {
          variant.regions.push(regionEntity.id)
        }
      }
    }
    if (input.addRegions) {
      if (!variant.regions) variant.regions = []
      for (const region of input.addRegions) {
        const regionEntity = await this.em.findOne(Region, { id: region.id })
        if (!regionEntity) throw NotFoundErr(`Region with ID "${region.id}" not found`)
        if (!variant.regions.includes(regionEntity.id)) {
          variant.regions.push(regionEntity.id)
        }
      }
    }
    if (input.removeRegions) {
      variant.regions = (variant.regions ?? []).filter((id) => !input.removeRegions!.includes(id))
    }
    if (input.regions || input.addRegions || input.removeRegions) {
      if (variant.regions && variant.regions.length > 0) {
        if (!change) {
          const primaryRegion = await this.em.findOne(Region, { id: variant.regions[0] })
          if (!primaryRegion) throw NotFoundErr(`Region with ID "${variant.regions[0]}" not found`)
          variant.region = ref(primaryRegion)
        } else {
          variant.region = await this.editService.findRefWithChange(change, Region, {
            id: variant.regions[0],
          })
        }
      } else {
        variant.region = undefined
      }
    }
    if (input.region) {
      if (!change) {
        const region = await this.em.findOne(Region, { id: input.region.id })
        if (!region) throw NotFoundErr(`Region with ID "${input.region.id}" not found`)
        variant.region = ref(region)
        if (!variant.regions) variant.regions = []
        if (!variant.regions.includes(region.id)) {
          variant.regions.unshift(region.id)
        } else if (variant.regions[0] !== region.id) {
          variant.regions = [region.id, ...variant.regions.filter((r) => r !== region.id)]
        }
      } else {
        const regionId = input.region.id
        const region = await this.editService.findRefWithChange(change, Region, { id: regionId })
        variant.region = region
        if (!variant.regions) variant.regions = []
        if (!variant.regions.includes(regionId)) {
          variant.regions.unshift(regionId)
        } else if (variant.regions[0] !== regionId) {
          variant.regions = [regionId, ...variant.regions.filter((r) => r !== regionId)]
        }
      }
    }
    if (input.orgs || input.addOrgs) {
      variant.variantOrgs = await this.editService.setOrAddPivot(
        variant.id,
        change,
        variant.variantOrgs,
        Variant,
        VariantsOrgs,
        input.orgs,
        input.addOrgs,
      )
    }
    if (input.removeOrgs) {
      variant.variantOrgs = await this.editService.removeFromPivot(
        change,
        variant.variantOrgs,
        Variant,
        VariantsOrgs,
        input.removeOrgs,
      )
    }
    if (input.tags || input.addTags) {
      for (const tag of input.tags || input.addTags || []) {
        await this.tagService.validateTagInput(tag)
      }
      variant.variantTags = await this.editService.setOrAddPivot(
        variant.id,
        change,
        variant.variantTags,
        Variant,
        VariantsTags,
        input.tags,
        input.addTags,
      )
    }
    if (input.removeTags) {
      variant.variantTags = await this.editService.removeFromPivot(
        change,
        variant.variantTags,
        Variant,
        VariantsTags,
        input.removeTags,
      )
    }
    if (input.components || input.addComponents) {
      variant.variantComponents = await this.editService.setOrAddPivot(
        variant.id,
        change,
        variant.variantComponents,
        Variant,
        VariantsComponents,
        input.components,
        input.addComponents,
      )
    }
    if (input.removeComponents) {
      variant.variantComponents = await this.editService.removeFromPivot(
        change,
        variant.variantComponents,
        Variant,
        VariantsComponents,
        input.removeComponents,
      )
    }
  }
}
