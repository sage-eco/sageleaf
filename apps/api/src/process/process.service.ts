import { EntityManager, ref } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { DeleteInput, isUsingChange } from '@src/changes/change-ext.model'
import { Change } from '@src/changes/change.entity'
import { EditService } from '@src/changes/edit.service'
import { NotFoundErr } from '@src/common/exceptions'
import { I18nService } from '@src/common/i18n.service'
import { CursorOptions } from '@src/common/transform'
import { IEntityService, IsEntityService, QueryField } from '@src/db/base.entity'
import { LocationService } from '@src/geo/location.service'
import { Place } from '@src/geo/place.entity'
import { Region } from '@src/geo/region.entity'
import { Material } from '@src/process/material.entity'
import { Process, ProcessHistory, ProcessSources } from '@src/process/process.entity'
import { CreateProcessInput, UpdateProcessInput } from '@src/process/process.model'
import { Variant } from '@src/product/variant.entity'
import { Org } from '@src/users/org.entity'

@Injectable()
@IsEntityService(Process)
export class ProcessService implements IEntityService<Process> {
  constructor(
    private readonly em: EntityManager,
    private readonly editService: EditService,
    private readonly i18n: I18nService,
    private readonly locationService: LocationService,
  ) {}

  queryFields(): Record<string, QueryField> {
    return {
      material: { operators: ['SEARCH', 'EXACT'], dbField: 'material' },
      region: { operators: ['SEARCH', 'EXACT'], dbField: 'region' },
      org: { operators: ['SEARCH', 'EXACT'], dbField: 'org' },
    }
  }

  async find(opts: CursorOptions<Process>) {
    if (opts.where.region && typeof opts.where.region === 'string') {
      const regionSearch = await this.locationService.resolveLocation(opts.where.region)
      if (regionSearch) {
        opts.where.region = { $in: regionSearch }
      }
    }
    const processes = await this.em.find(Process, opts.where, opts.options)
    const count = await this.em.count(Process, opts.where, { filters: opts.options.filters })
    return {
      items: processes,
      count,
    }
  }

  async findOneByID(id: string) {
    return await this.em.findOne(
      Process,
      { id },
      {
        populate: ['material', 'variant', 'org', 'processSources', 'region', 'place'],
      },
    )
  }

  async findManyByID(ids: string[]) {
    return this.em.find(Process, { id: { $in: ids } })
  }
  async create(input: CreateProcessInput, userID: string) {
    const process = new Process()
    if (!isUsingChange(input)) {
      this.editService.assertDirectCreateAllowed()
      await this.setFields(process, input)
      await this.editService.createHistory(
        Process.name,
        userID,
        undefined,
        this.editService.entityToChangePOJO(Process.name, process),
      )
      await this.em.persist(process).flush()
      return {
        process,
        change: null,
      }
    }
    const change = await this.editService.findOneOrCreate(input.changeID, input.change, userID)
    await this.setFields(process, input, change)
    await this.editService.createEntityEdit(change, process)
    await this.editService.persistChange(change)
    await this.editService.checkMerge(change, input)
    return {
      process,
      change,
    }
  }

  async update(input: UpdateProcessInput, userID: string) {
    const { entity: process, change } = await this.editService.findOneWithChangeInput(
      input,
      userID,
      Process,
      {
        id: input.id,
      },
      { populate: ['processSources'] },
    )
    if (!process) {
      throw new Error(`Process with ID "${input.id}" not found`)
    }
    if (!change) {
      const original = this.editService.entityToChangePOJO(Process.name, process)
      await this.setFields(process, input)
      await this.editService.createHistory(
        Process.name,
        userID,
        original,
        this.editService.entityToChangePOJO(Process.name, process),
      )
      await this.em.persist(process).flush()
      return {
        process,
        change: null,
      }
    }
    await this.editService.beginUpdateEntityEdit(change, process)
    await this.setFields(process, input, change)
    await this.editService.updateEntityEdit(change, process)
    const currentProcess = await this.editService.findOneForChange(this.em, change, Process, {
      id: input.id,
    })
    await this.editService.persistChange(change)
    await this.editService.checkMerge(change, input)
    return {
      process,
      change,
      currentProcess: currentProcess ?? undefined,
    }
  }

  async delete(input: DeleteInput) {
    const deleted = await this.editService.deleteOneWithChange(input, Process)
    if (!deleted) {
      throw NotFoundErr(`Process with ID "${input.id}" not found`)
    }
    return deleted
  }

  async sources(processID: string, opts: CursorOptions<ProcessSources>) {
    opts.where.process = this.em.getReference(Process, processID)
    opts.options.populate = ['source']
    const items = await this.em.find(ProcessSources, opts.where, opts.options)
    const count = await this.em.count(ProcessSources, { process: opts.where.process })
    return { items, count }
  }

  async history(processID: string, opts: CursorOptions<ProcessHistory>) {
    const items = await this.em.find(
      ProcessHistory,
      { process: processID, ...opts.where },
      {
        populate: ['user'],
        orderBy: opts.options.orderBy,
        limit: opts.options.limit,
      },
    )
    const count = await this.em.count(ProcessHistory, { process: processID })
    return { items, count }
  }

  async setFields(
    process: Process,
    input: Partial<CreateProcessInput & UpdateProcessInput>,
    change?: Change,
  ) {
    if (input.addSources) {
      process.processSources = await this.editService.setOrAddPivot(
        process.id,
        change,
        process.processSources,
        Process,
        ProcessSources,
        undefined,
        input.addSources,
      )
      if (change) {
        await this.editService.linkChangeSources(
          change,
          input.addSources.map((s) => s.id),
        )
      }
    }
    if (input.removeSources) {
      process.processSources = await this.editService.removeFromPivot(
        change,
        process.processSources,
        Process,
        ProcessSources,
        input.removeSources,
      )
    }
    if (input.intent) {
      process.intent = input.intent
    }
    if (input.name) {
      process.name = this.i18n.addTrReq(process.name, input.name, input.lang)
    }
    if (input.nameTr) {
      process.name = this.i18n.addTrReq(process.name, input.nameTr, input.lang)
    }
    if (input.desc) {
      process.desc = this.i18n.addTr(process.desc, input.desc, input.lang)
    }
    if (input.descTr) {
      process.desc = this.i18n.addTr(process.desc, input.descTr, input.lang)
    }
    if (input.instructions) {
      process.instructions = input.instructions
    }
    if (input.efficiency) {
      process.efficiency = input.efficiency
    }
    if (input.rules) {
      process.rules = input.rules
    }
    if (input.material) {
      if (!change) {
        const material = await this.em.findOne(Material, input.material.id)
        if (!material) {
          throw NotFoundErr(`Material with ID "${input.material.id}" not found`)
        }
        process.material = ref(Material, material.id)
      } else {
        process.material = await this.editService.findRefWithChange(change, Material, {
          id: input.material.id,
        })
      }
    }
    if (input.variant) {
      if (!change) {
        const variant = await this.em.findOne(Variant, { id: input.variant.id })
        if (!variant) {
          throw NotFoundErr(`Variant with ID "${input.variant.id}" not found`)
        }
        process.variant = ref(Variant, variant.id)
      } else {
        process.variant = await this.editService.findRefWithChange(change, Variant, {
          id: input.variant.id,
        })
      }
    }
    if (input.org) {
      if (!change) {
        const org = await this.em.findOne(Org, { id: input.org.id })
        if (!org) {
          throw NotFoundErr(`Org with ID "${input.org.id}" not found`)
        }
        process.org = ref(Org, org.id)
      } else {
        process.org = await this.editService.findRefWithChange(change, Org, {
          id: input.org.id,
        })
      }
    }
    if (input.region) {
      if (!change) {
        const region = await this.em.findOne(Region, { id: input.region.id })
        if (!region) {
          throw NotFoundErr(`Region with ID "${input.region.id}" not found`)
        }
        process.region = ref(Region, region.id)
      } else {
        process.region = await this.editService.findRefWithChange(change, Region, {
          id: input.region.id,
        })
      }
    }
    if (input.place) {
      if (!change) {
        const place = await this.em.findOne(Place, { id: input.place.id })
        if (!place) {
          throw NotFoundErr(`Place with ID "${input.place.id}" not found`)
        }
        process.place = ref(Place, place.id)
      } else {
        process.place = await this.editService.findRefWithChange(change, Place, {
          id: input.place.id,
        })
      }
    }
  }
}
