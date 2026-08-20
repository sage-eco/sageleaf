import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { DeleteInput, isUsingChange } from '@src/changes/change-ext.model'
import { Change } from '@src/changes/change.entity'
import { EditService } from '@src/changes/edit.service'
import { ConflictErr, NotFoundErr } from '@src/common/exceptions'
import { I18nService } from '@src/common/i18n.service'
import { CursorOptions } from '@src/common/transform'
import { IEntityService, IsEntityService, QueryField } from '@src/db/base.entity'
import { Place } from '@src/geo/place.entity'
import { Process } from '@src/process/process.entity'
import { Program } from '@src/process/program.entity'
import { Variant } from '@src/product/variant.entity'
import { Org, OrgHistory } from '@src/users/org.entity'
import { CreateOrgInput, UpdateOrgInput } from '@src/users/org.model'
import { User } from '@src/users/users.entity'

@Injectable()
@IsEntityService(Org)
export class OrgService implements IEntityService<Org> {
  constructor(
    private readonly em: EntityManager,
    private readonly editService: EditService,
    private readonly i18n: I18nService,
  ) {}

  queryFields(): Record<string, QueryField> {
    return {}
  }

  async find(opts: CursorOptions<Org>) {
    const items = await this.em.find(Org, opts.where, opts.options)
    const count = await this.em.count(Org, opts.where, { filters: opts.options.filters })
    return { items, count }
  }

  async findOneByID(id: string) {
    return await this.em.findOne(Org, { id })
  }

  async findManyByID(ids: string[]) {
    return this.em.find(Org, { id: { $in: ids } })
  }

  async users(orgID: string, opts: CursorOptions<User>) {
    opts.where.orgs = orgID
    const users = await this.em.find(User, opts.where, opts.options)
    const count = await this.em.count(User, opts.where)
    return {
      items: users,
      count,
    }
  }

  async places(orgID: string, opts: CursorOptions<Place>) {
    opts.where.org = orgID
    const items = await this.em.find(Place, opts.where, opts.options)
    const count = await this.em.count(Place, opts.where, { filters: opts.options.filters })
    return { items, count }
  }

  async processes(orgID: string, opts: CursorOptions<Process>) {
    opts.where.org = orgID
    const items = await this.em.find(Process, opts.where, opts.options)
    const count = await this.em.count(Process, opts.where, { filters: opts.options.filters })
    return { items, count }
  }

  async programs(orgID: string, opts: CursorOptions<Program>) {
    opts.where.orgs = this.em.getReference(Org, orgID)
    const items = await this.em.find(Program, opts.where, opts.options)
    const count = await this.em.count(Program, { orgs: opts.where.orgs })
    return { items, count }
  }

  async variants(orgID: string, opts: CursorOptions<Variant>) {
    opts.where.orgs = this.em.getReference(Org, orgID)
    const items = await this.em.find(Variant, opts.where, opts.options)
    const count = await this.em.count(Variant, { orgs: opts.where.orgs })
    return { items, count }
  }

  async create(input: CreateOrgInput, userID: string) {
    const checkOrg = await this.em.findOne(Org, { slug: input.slug })
    if (checkOrg) {
      throw ConflictErr('ORG_CONFLICT', `Org with slug ${input.slug} already exists`)
    }
    const org = new Org()
    if (!isUsingChange(input)) {
      this.editService.assertDirectCreateAllowed()
      await this.setFields(org, input)
      await this.editService.createHistory(
        Org.name,
        userID,
        undefined,
        this.editService.entityToChangePOJO(Org.name, org),
      )
      await this.em.persist(org).flush()
      return { org }
    }
    const change = await this.editService.findOneOrCreate(input.changeID, input.change, userID)
    await this.setFields(org, input, change)
    await this.editService.createEntityEdit(change, org)
    await this.editService.persistChange(change)
    await this.editService.checkMerge(change, input)
    return { org, change }
  }

  async update(input: UpdateOrgInput, userID: string) {
    const { entity: org, change } = await this.editService.findOneWithChangeInput(
      input,
      userID,
      Org,
      {
        id: input.id,
      },
    )
    if (!org) {
      throw NotFoundErr('ORG_NOT_FOUND', `Org with id ${input.id} not found`)
    }
    if (!change) {
      const original = this.editService.entityToChangePOJO(Org.name, org)
      await this.setFields(org, input)
      await this.editService.createHistory(
        Org.name,
        userID,
        original,
        this.editService.entityToChangePOJO(Org.name, org),
      )
      await this.em.persist(org).flush()
      return { org }
    }
    await this.editService.beginUpdateEntityEdit(change, org)
    await this.setFields(org, input, change)
    await this.editService.updateEntityEdit(change, org)
    const currentOrg = await this.editService.findOneForChange(this.em, change, Org, {
      id: input.id,
    })
    await this.editService.persistChange(change)
    await this.editService.checkMerge(change, input)
    return { org, change, currentOrg: currentOrg ?? undefined }
  }

  async delete(input: DeleteInput) {
    const deleted = await this.editService.deleteOneWithChange(input, Org)
    if (!deleted) {
      throw NotFoundErr('ORG_NOT_FOUND', `Org not found`)
    }
    return deleted
  }

  async history(orgID: string, opts: CursorOptions<OrgHistory>) {
    const items = await this.em.find(
      OrgHistory,
      { org: orgID, ...opts.where },
      {
        populate: ['user'],
        orderBy: opts.options.orderBy,
        limit: opts.options.limit,
      },
    )
    const count = await this.em.count(OrgHistory, { org: orgID })
    return { items, count }
  }

  async setFields(org: Org, input: Partial<CreateOrgInput & UpdateOrgInput>, change?: Change) {
    if (input.name) {
      org.name = input.name
      org.nameTr = this.i18n.addTrReq(org.nameTr, input.name, input.lang)
    }
    if (input.slug) {
      org.slug = input.slug
    }
    if (input.desc) {
      org.desc = this.i18n.addTrReq(org.desc, input.desc, input.lang)
    }
    if (input.avatarURL) {
      org.avatarURL = input.avatarURL
    }
    if (input.websiteURL) {
      org.websiteURL = input.websiteURL
    }
  }
}
