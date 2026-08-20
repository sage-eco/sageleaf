import { EntityManager, ref } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { isUsingChange } from '@src/changes/change-ext.model'
import { Change } from '@src/changes/change.entity'
import { EditService } from '@src/changes/edit.service'
import { mapOrderBy } from '@src/common/db.utils'
import { NotFoundErr } from '@src/common/exceptions'
import { I18nService } from '@src/common/i18n.service'
import { CursorOptions } from '@src/common/transform'
import { IEntityService, IsEntityService, QueryField } from '@src/db/base.entity'
import { LocationService } from '@src/geo/location.service'
import { Region } from '@src/geo/region.entity'
import { Process } from '@src/process/process.entity'
import {
  Program,
  ProgramHistory,
  ProgramsOrgs,
  ProgramsProcesses,
  ProgramsTags,
} from '@src/process/program.entity'
import { CreateProgramInput, UpdateProgramInput } from '@src/process/program.model'
import { Tag } from '@src/process/tag.entity'
import { TagService } from '@src/process/tag.service'
import { Org } from '@src/users/org.entity'

@Injectable()
@IsEntityService(Program)
export class ProgramService implements IEntityService<Program> {
  constructor(
    private readonly em: EntityManager,
    private readonly editService: EditService,
    private readonly tagService: TagService,
    private readonly i18n: I18nService,
    private readonly locationService: LocationService,
  ) {}

  queryFields(): Record<string, QueryField> {
    return {}
  }

  async findOneByID(id: string) {
    return await this.em.findOne(
      Program,
      { id },
      { populate: ['region', 'programOrgs', 'programProcesses', 'programTags'] },
    )
  }

  async findManyByID(ids: string[]) {
    return this.em.find(
      Program,
      { id: { $in: ids } },
      { populate: ['region', 'programOrgs', 'programProcesses', 'programTags'] },
    )
  }

  async find(opts: CursorOptions<Program>) {
    if (opts.where.region && typeof opts.where.region === 'string') {
      const regionSearch = await this.locationService.resolveLocation(opts.where.region)
      if (regionSearch) {
        opts.where.region = { $in: regionSearch }
      }
    }
    opts.options.populate = ['region', 'programOrgs', 'programProcesses', 'programTags']
    const programs = await this.em.find(Program, opts.where, opts.options)
    const count = await this.em.count(Program, opts.where, { filters: opts.options.filters })
    return {
      items: programs,
      count,
    }
  }

  async orgs(programID: string, opts: CursorOptions<Org>) {
    opts.where.programs = this.em.getReference(Program, programID)
    const orgs = await this.em.find(Org, opts.where, opts.options)
    const count = await this.em.count(Org, { programs: opts.where.programs })
    return {
      items: orgs,
      count,
    }
  }

  async processes(programID: string, opts: CursorOptions<Process>) {
    opts.where.programs = this.em.getReference(Program, programID)
    const processes = await this.em.find(Process, opts.where, opts.options)
    const count = await this.em.count(Process, { programs: opts.where.programs })
    return {
      items: processes,
      count,
    }
  }

  async tagsList(programID: string) {
    const tagDefs = await this.em.find(Tag, { programs: programID })
    const tags = await this.em.find(
      ProgramsTags,
      { program: programID },
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

  async tags(programID: string, opts: CursorOptions<Tag>) {
    opts.where.programs = this.em.getReference(Program, programID)
    const tagDefs = await this.em.find(Tag, opts.where, opts.options)
    const tags = await this.em.find(
      ProgramsTags,
      { program: programID },
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
    const count = await this.em.count(ProgramsTags, { program: opts.where.programs })
    return {
      items: combinedTags,
      count,
    }
  }

  async create(input: CreateProgramInput, userID: string) {
    const program = new Program()
    if (!isUsingChange(input)) {
      this.editService.assertDirectCreateAllowed()
      await this.setFields(program, input)
      await this.editService.createHistory(
        Program.name,
        userID,
        undefined,
        this.editService.entityToChangePOJO(Program.name, program),
      )
      await this.em.persist(program).flush()
      return { program }
    }
    const change = await this.editService.findOneOrCreate(input.changeID, input.change, userID)
    await this.setFields(program, input, change)
    await this.editService.createEntityEdit(change, program)
    await this.editService.persistChange(change)
    await this.editService.checkMerge(change, input)
    return { program, change }
  }

  async update(input: UpdateProgramInput, userID: string) {
    const { entity: program, change } = await this.editService.findOneWithChangeInput(
      input,
      userID,
      Program,
      {
        id: input.id,
      },
      { populate: ['region', 'programOrgs', 'programProcesses', 'programTags'] },
    )
    if (!program) {
      throw new Error('Program not found')
    }
    if (!change) {
      const original = this.editService.entityToChangePOJO(Program.name, program)
      await this.setFields(program, input)
      await this.editService.createHistory(
        Program.name,
        userID,
        original,
        this.editService.entityToChangePOJO(Program.name, program),
      )
      await this.em.persist(program).flush()
      return { program }
    }
    await this.editService.beginUpdateEntityEdit(change, program)
    await this.setFields(program, input, change)
    await this.editService.updateEntityEdit(change, program)
    const currentProgram = await this.editService.findOneForChange(this.em, change, Program, {
      id: input.id,
    })
    await this.editService.persistChange(change)
    await this.editService.checkMerge(change, input)
    return { program, change, currentProgram: currentProgram ?? undefined }
  }

  async history(programID: string, opts: CursorOptions<ProgramHistory>) {
    const items = await this.em.find(
      ProgramHistory,
      { program: programID, ...opts.where },
      {
        populate: ['user'],
        orderBy: opts.options.orderBy,
        limit: opts.options.limit,
      },
    )
    const count = await this.em.count(ProgramHistory, { program: programID })
    return { items, count }
  }

  private async setFields(
    program: Program,
    input: Partial<CreateProgramInput & UpdateProgramInput>,
    change?: Change,
  ) {
    if (input.name) {
      program.name = this.i18n.addTrReq(program.name, input.name, input.lang)
    }
    if (input.nameTr) {
      program.name = this.i18n.addTrReq(program.name, input.nameTr, input.lang)
    }
    if (input.desc) {
      program.desc = this.i18n.addTr(program.desc, input.desc, input.lang)
    }
    if (input.descTr) {
      program.desc = this.i18n.addTr(program.desc, input.descTr, input.lang)
    }
    if (input.social !== undefined) {
      const social = { ...program.social }
      if (input.social.links !== undefined) {
        social.links = input.social.links
      }
      if (input.social.phones !== undefined) {
        social.phones = input.social.phones
      }
      if (input.social.address) {
        social.address = this.i18n.addTr(program.social?.address, input.social.address, input.lang)
      }
      if (input.social.addressTr) {
        social.address = this.i18n.addTr(
          program.social?.address,
          input.social.addressTr,
          input.lang,
        )
      }
      program.social = social
    }
    if (input.instructions !== undefined) {
      program.instructions = input.instructions
    }
    if (input.status !== undefined) {
      program.status = input.status
    }

    if (input.region !== undefined) {
      if (input.region) {
        if (!change) {
          const region = await this.em.findOne(Region, { id: input.region })
          if (!region) {
            throw NotFoundErr(`Region with ID "${input.region}" not found`)
          }
          program.region = ref(Region, region.id)
        } else {
          program.region = await this.editService.findRefWithChange(change, Region, {
            id: input.region,
          })
        }
      } else {
        program.region = undefined
      }
    }

    if (input.orgs || input.addOrgs) {
      program.programOrgs = await this.editService.setOrAddPivot(
        program.id,
        change,
        program.programOrgs,
        Program,
        ProgramsOrgs,
        input.orgs,
        input.addOrgs,
      )
    }
    if (input.removeOrgs) {
      program.programOrgs = await this.editService.removeFromPivot(
        change,
        program.programOrgs,
        Program,
        ProgramsOrgs,
        input.removeOrgs,
      )
    }

    if (input.processes || input.addProcesses) {
      program.programProcesses = await this.editService.setOrAddPivot(
        program.id,
        change,
        program.programProcesses,
        Program,
        ProgramsProcesses,
        input.processes,
        input.addProcesses,
      )
    }
    if (input.removeProcesses) {
      program.programProcesses = await this.editService.removeFromPivot(
        change,
        program.programProcesses,
        Program,
        ProgramsProcesses,
        input.removeProcesses,
      )
    }

    if (input.tags || input.addTags) {
      for (const tag of input.tags || input.addTags || []) {
        await this.tagService.validateTagInput(tag)
      }
      program.programTags = await this.editService.setOrAddPivot(
        program.id,
        change,
        program.programTags,
        Program,
        ProgramsTags,
        input.tags,
        input.addTags,
      )
    }
    if (input.removeTags) {
      program.programTags = await this.editService.removeFromPivot(
        change,
        program.programTags,
        Program,
        ProgramsTags,
        input.removeTags,
      )
    }
  }
}
