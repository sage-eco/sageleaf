import {
  BaseEntity,
  Collection,
  Entity,
  Index,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OptionalProps,
  PrimaryKey,
  PrimaryKeyProp,
  Property,
  type Ref,
} from '@mikro-orm/core'

import { ExcludeFromDiff } from '@src/common/exclude-from-diff.decorator'
import { defaultTranslatedField, type TranslatedField } from '@src/common/i18n'
import { type JSONObject, type Rank, RANK_ORDER_SQL } from '@src/common/z.schema'
import { IDCreatedUpdated } from '@src/db/base.entity'
import { Place } from '@src/geo/place.entity'
import { Process } from '@src/process/process.entity'
import { Program } from '@src/process/program.entity'
import { Variant } from '@src/product/variant.entity'
import { User } from '@src/users/users.entity'

@Entity({ tableName: 'orgs', schema: 'public' })
@Index({
  name: 'orgs_rank_order_idx',
  expression: `create index "orgs_rank_order_idx" on "orgs" (rank_order desc, id desc)`,
})
export class Org extends IDCreatedUpdated {
  [OptionalProps]?: 'rankOrder'

  @Property({ length: 128 })
  name!: string

  @Property({ unique: true, length: 128 })
  slug!: string

  @Property({ type: 'json' })
  desc: TranslatedField = defaultTranslatedField()

  @Property()
  avatarURL?: string

  @Property()
  websiteURL?: string

  @Property()
  metadata?: string

  @Property({ fieldName: 'name_translations', type: 'json' })
  nameTr: TranslatedField = defaultTranslatedField()

  @ExcludeFromDiff()
  @Property({ type: 'json' })
  rank?: Rank

  @ExcludeFromDiff()
  @Property({ type: 'double precision', generated: `(${RANK_ORDER_SQL}) stored`, nullable: false })
  rankOrder!: number

  @ManyToMany({ entity: () => User, mappedBy: 'orgs' })
  users = new Collection<User>(this)

  @OneToMany(() => Invitation, (invitation) => invitation.org)
  invitations = new Collection<Invitation>(this)

  @ManyToMany({ entity: () => Variant, mappedBy: 'orgs' })
  variants = new Collection<Variant>(this)

  @OneToMany({ mappedBy: 'org' })
  processes = new Collection<Process>(this)

  @OneToMany({ mappedBy: 'org' })
  places = new Collection<Place>(this)

  @ManyToMany({ entity: () => Program, mappedBy: 'orgs' })
  programs = new Collection<Program>(this)

  @OneToMany({ mappedBy: 'org' })
  history = new Collection<OrgHistory>(this)
}

@Entity({ tableName: 'org_history', schema: 'public' })
export class OrgHistory extends BaseEntity {
  @ManyToOne({ primary: true })
  org!: Org

  @PrimaryKey()
  datetime!: Date;

  [PrimaryKeyProp]?: ['org', 'datetime']

  @ManyToOne()
  user!: Ref<User>

  @Property({ type: 'json' })
  original?: JSONObject

  @Property({ type: 'json' })
  changes?: JSONObject
}

@Entity({ tableName: 'invitations', schema: 'public' })
export class Invitation extends IDCreatedUpdated {
  @ManyToOne()
  @Index()
  inviter!: User & {}

  @ManyToOne()
  @Index()
  org!: Org

  @Property()
  email!: string

  @Property()
  role!: string

  @Property()
  status!: string

  @Property()
  expiresAt!: Date
}
