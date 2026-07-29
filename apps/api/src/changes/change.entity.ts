import {
  BaseEntity,
  Collection,
  Entity,
  Enum,
  Index,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryKey,
  Property,
} from '@mikro-orm/core'
import type { Ref } from '@mikro-orm/core'

import { Source } from '@src/changes/source.entity'
import { type JSONObject } from '@src/common/z.schema'
import { CreatedUpdated, generateID, IDCreatedUpdated } from '@src/db/base.entity'
import { User } from '@src/users/users.entity'

export enum ChangeStatus {
  DRAFT = 'DRAFT',
  PROPOSED = 'PROPOSED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  MERGED = 'MERGED',
}

export interface Suggestion {
  // Suggested changes for the entity
  changes?: JSONObject
  // The user making the suggestion
  userID: string
  // Description of the suggestion
  description?: string
}

export interface StoredJob {
  // Windmill job UUID
  id: string
  // Job type
  type: 'REVIEW' | 'EDIT'
  // Associated edit IDs, populated when type === 'EDIT'
  editIds?: string[]
  // Last-known status mirror
  status: string
  // ISO datetime of last update
  updatedAt: string
}

export interface ChangeMetadata {
  // The last time the change was checked
  checkedAt?: string
  // Windmill jobs associated with this change
  jobs?: StoredJob[]
}

@Entity({ tableName: 'changes', schema: 'public' })
@Index({
  name: 'changes_updated_at_idx',
  expression: `create index "changes_updated_at_idx" on "changes" (updated_at desc, id desc)`,
})
export class Change extends IDCreatedUpdated {
  @Property()
  title?: string

  @Property()
  description?: string

  @Enum(() => ChangeStatus)
  status: ChangeStatus = ChangeStatus.DRAFT

  @ManyToOne(() => User)
  user!: Ref<User>

  @OneToMany({
    entity: () => ChangeEdits,
    mappedBy: (edit) => edit.change,
    orphanRemoval: true,
  })
  edits = new Collection<ChangeEdits>(this)

  @ManyToMany({
    entity: () => Source,
    pivotEntity: () => ChangesSources,
  })
  sources = new Collection<Source>(this)

  @Property({ type: 'json' })
  metadata?: ChangeMetadata
}

@Entity({ tableName: 'change_edits', schema: 'public' })
export class ChangeEdits extends CreatedUpdated {
  constructor(init?: Partial<ChangeEdits>) {
    super()
    this.edit_id = generateID()
    Object.assign(this, init)
  }

  @ManyToOne({ primary: true })
  change!: Change

  @PrimaryKey()
  edit_id!: string

  // The name of the created/updated/deleted entity
  @Property()
  entityName!: string

  // The ID of the created/updated/deleted entity
  @Property()
  entityID?: string

  // The current state of the entity
  @Property({ type: 'json' })
  original?: JSONObject

  // The new state of the entity
  @Property({ type: 'json' })
  changes?: JSONObject

  // The user making the change
  @Property()
  userID!: string

  // Description of the change
  @Property()
  description?: string

  // Suggested changes for the edit
  @Property({ type: 'json' })
  suggestions?: Suggestion[]

  _type: any
}

@Entity({ tableName: 'changes_sources', schema: 'public' })
export class ChangesSources extends BaseEntity {
  @ManyToOne({ primary: true })
  change!: Change

  @ManyToOne({ primary: true })
  source!: Source & {}
}
