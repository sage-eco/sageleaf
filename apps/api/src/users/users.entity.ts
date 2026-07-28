import {
  Collection,
  Entity,
  Index,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OptionalProps,
  Property,
} from '@mikro-orm/core'
import type { Opt } from '@mikro-orm/core'

import { Account } from '@src/auth/account.entity'
import { Session } from '@src/auth/session.entity'
import { ExcludeFromDiff } from '@src/common/exclude-from-diff.decorator'
import { type Rank, RANK_ORDER_SQL } from '@src/common/z.schema'
import { IDCreatedUpdated } from '@src/db/base.entity'
import { Org } from '@src/users/org.entity'

export interface ProfileField {
  bio?: string
}

@Entity({ tableName: 'users', schema: 'public' })
@Index({
  name: 'users_rank_order_idx',
  expression: `create index "users_rank_order_idx" on "users" (rank_order desc, id desc)`,
})
export class User extends IDCreatedUpdated {
  [OptionalProps]?: 'rankOrder'

  constructor(email: string, username: string, name: string) {
    super()
    this.email = email
    this.username = username
    this.name = name
  }

  @Property({ unique: true, length: 1024 })
  email: string

  @Property()
  emailVerified: boolean & Opt = false

  @Property({ unique: true, length: 64 })
  username: string

  @Property({ length: 64 })
  displayUsername!: string

  @Property()
  name: string

  @Property()
  avatarURL?: string

  @Property()
  lang?: string

  @Property({ type: 'json' })
  profile?: ProfileField

  @Property()
  banned: boolean & Opt = false

  @Property()
  banReason?: string

  @Property({ type: 'timestamptz', nullable: true })
  banExpires?: number

  @Property()
  role?: string

  @ExcludeFromDiff()
  @Property({ type: 'json' })
  rank?: Rank

  @ExcludeFromDiff()
  @Property({ type: 'double precision', generated: `(${RANK_ORDER_SQL}) stored`, nullable: false })
  rankOrder!: number

  @OneToMany({ mappedBy: 'user' })
  sessions = new Collection<Session>(this)

  @OneToMany({ mappedBy: 'user' })
  accounts = new Collection<Account>(this)

  @ManyToMany({ entity: () => Org, pivotEntity: () => UsersOrgs })
  orgs = new Collection<Org>(this)
}

export enum UserOrgRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Entity({ tableName: 'users_orgs', schema: 'public' })
export class UsersOrgs extends IDCreatedUpdated {
  @ManyToOne()
  @Index({ name: 'users_orgs_user_id_index' })
  user!: User

  @ManyToOne()
  @Index({ name: 'users_orgs_org_id_index' })
  org!: Org & {}

  @Property({ type: 'varchar' })
  role: UserOrgRole & Opt = UserOrgRole.MEMBER
}
