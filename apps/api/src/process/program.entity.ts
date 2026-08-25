import {
  BaseEntity,
  Collection,
  Entity,
  Enum,
  Filter,
  Index,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OptionalProps,
  PrimaryKey,
  PrimaryKeyProp,
  Property,
} from '@mikro-orm/core'
import type { Ref } from '@mikro-orm/core'
import { raw } from '@mikro-orm/postgresql'
import { z } from 'zod/v4'

import { ExcludeFromDiff } from '@src/common/exclude-from-diff.decorator'
import type { TranslatedField } from '@src/common/i18n'
import { ExternalLinkSchema } from '@src/common/link.schema'
import { PhoneEntrySchema } from '@src/common/phone.schema'
import { type JSONObject, type Rank, RANK_ORDER_SQL } from '@src/common/z.schema'
import { IDCreatedUpdated } from '@src/db/base.entity'
import { Region } from '@src/geo/region.entity'
import { Process } from '@src/process/process.entity'
import { Tag } from '@src/process/tag.entity'
import { Org } from '@src/users/org.entity'
import { User } from '@src/users/users.entity'

export enum ProgramStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
}

export enum ProgramOrgRole {
  OPERATOR = 'OPERATOR',
  SPONSOR = 'SPONSOR',
  HOST = 'HOST',
  FUNDER = 'FUNDER',
  OTHER = 'OTHER',
}

export const ProgramSocialSchema = z.object({
  links: z.array(ExternalLinkSchema).optional(),
  phones: z.array(PhoneEntrySchema).optional(),
  address: z.custom<TranslatedField>().optional(),
})
export type ProgramSocial = z.infer<typeof ProgramSocialSchema>

export const ProgramInstructionsSchema = z.object({
  primaryLinks: z.array(ExternalLinkSchema).optional(),
})
export type ProgramInstructions = z.infer<typeof ProgramInstructionsSchema>

@Entity({ tableName: 'programs', schema: 'public' })
@Index({
  name: 'programs_rank_order_idx',
  expression: `create index "programs_rank_order_idx" on "programs" (rank_order desc, id desc)`,
})
@Filter({
  name: 'rankOrderCursor',
  cond: (args: { cmp: '$gte' | '$lte'; order: number; id: string }) => ({
    [raw('(rank_order, id)')]: { [args.cmp]: raw('(?, ?)', [args.order, args.id]) },
  }),
})
export class Program extends IDCreatedUpdated {
  [OptionalProps]?: 'rankOrder'

  @Property({ type: 'json' })
  name!: TranslatedField

  @Property({ type: 'json' })
  desc?: TranslatedField

  @Property({ type: 'json' })
  social?: ProgramSocial

  @Property({ type: 'json' })
  instructions?: ProgramInstructions

  @Enum(() => ProgramStatus)
  status!: ProgramStatus

  @ExcludeFromDiff()
  @Property({ type: 'json' })
  rank?: Rank

  @ExcludeFromDiff()
  @Property({ type: 'double precision', generated: `(${RANK_ORDER_SQL}) stored`, nullable: false })
  rankOrder!: number

  @ManyToOne()
  region?: Ref<Region>

  @ManyToMany({ entity: () => Org, pivotEntity: () => ProgramsOrgs })
  orgs = new Collection<Org>(this)

  @OneToMany(() => ProgramsOrgs, (po) => po.program)
  programOrgs = new Collection<ProgramsOrgs>(this)

  @ManyToMany({ entity: () => Process, pivotEntity: () => ProgramsProcesses })
  processes = new Collection<Process>(this)

  @OneToMany(() => ProgramsProcesses, (pp) => pp.program)
  programProcesses = new Collection<ProgramsProcesses>(this)

  @ManyToMany({ entity: () => Tag, pivotEntity: () => ProgramsTags })
  tags = new Collection<Tag>(this)

  @OneToMany({
    entity: () => ProgramsTags,
    mappedBy: (pt) => pt.program,
    orphanRemoval: true,
  })
  programTags = new Collection<ProgramsTags>(this)

  @OneToMany(() => ProgramHistory, (history) => history.program)
  history = new Collection<ProgramHistory>(this)
}

@Entity({ tableName: 'programs_orgs', schema: 'public' })
export class ProgramsOrgs extends BaseEntity {
  @ManyToOne({ primary: true })
  program!: Program

  @ManyToOne({ primary: true })
  org!: Org & {}

  @Enum(() => ProgramOrgRole)
  role!: ProgramOrgRole
}

@Entity({ tableName: 'programs_processes', schema: 'public' })
export class ProgramsProcesses extends BaseEntity {
  @ManyToOne({ primary: true })
  program!: Program

  @ManyToOne({ primary: true })
  process!: Process & {}
}

@Entity({ tableName: 'programs_tags', schema: 'public' })
export class ProgramsTags extends BaseEntity {
  @ManyToOne({ primary: true })
  program!: Program

  @ManyToOne({ primary: true })
  tag!: Tag & {}

  @Property({ type: 'json' })
  meta?: Record<string, any>
}

@Entity({ tableName: 'program_history', schema: 'public' })
export class ProgramHistory extends BaseEntity {
  @ManyToOne({ primary: true })
  program!: Program

  @PrimaryKey()
  datetime!: Date;

  [PrimaryKeyProp]?: ['program', 'datetime']

  @ManyToOne()
  user!: Ref<User>

  @Property({ type: 'json' })
  original?: JSONObject

  @Property({ type: 'json' })
  changes?: JSONObject
}
