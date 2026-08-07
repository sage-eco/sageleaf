import type { FilterQuery } from '@mikro-orm/core'
import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { Change } from '@src/changes/change.entity'
import { BadRequestErr } from '@src/common/exceptions'
import { CursorOptions } from '@src/common/transform'
import { IEntityService, IsEntityService, QueryField } from '@src/db/base.entity'
import { Org } from '@src/users/org.entity'
import { User } from '@src/users/users.entity'

@Injectable()
@IsEntityService(User)
export class UsersService implements IEntityService<User> {
  constructor(private readonly em: EntityManager) {}

  queryFields(): Record<string, QueryField> {
    return {}
  }

  async findOneByID(id: string) {
    return await this.em.findOne(User, { id }, { populate: ['orgs'] })
  }

  async findManyByID(ids: string[]) {
    return this.em.find(User, { id: { $in: ids } }, { populate: ['orgs'] })
  }

  async findByUsernameOrEmail(usernameOrEmail: string) {
    let user = await this.em.findOne(User, { email: usernameOrEmail })
    if (!user) {
      user = await this.em.findOne(User, { username: usernameOrEmail })
    }
    return user
  }

  async findByUsernameOrEmailAuth(usernameOrEmail: string) {
    let user = await this.em.findOne(User, { email: usernameOrEmail })
    if (!user) {
      user = await this.em.findOne(User, { username: usernameOrEmail })
    }
    return user
  }

  async create(user: User) {
    let existing = await this.em.findOne(User, { email: user.email })
    if (!existing) {
      existing = await this.em.findOne(User, { username: user.username })
    }
    if (existing) {
      throw BadRequestErr('User already exists')
    }
    await this.em.persist(user).flush()
    return user
  }

  async changes(userID: string, opts: CursorOptions<Change>) {
    const where: FilterQuery<Change> = {
      ...opts.where,
      $or: [{ user: userID }, { edits: { userID } }],
    }
    const items = await this.em.find(Change, where, opts.options)
    const count = await this.em.count(Change, where)
    return { items, count }
  }

  async orgs(userID: string, opts: CursorOptions<Org>) {
    opts.where.users = this.em.getReference(User, userID)
    const orgs = await this.em.find(Org, opts.where, opts.options)
    const count = await this.em.count(Org, { users: opts.where.users })
    return {
      items: orgs,
      count,
    }
  }
}
