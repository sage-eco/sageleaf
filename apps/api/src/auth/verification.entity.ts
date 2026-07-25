import { Entity, Index, Property } from '@mikro-orm/postgresql'

import { IDCreatedUpdated } from '@src/db/base.entity'

@Entity({ tableName: 'verifications', schema: 'auth' })
export class Verification extends IDCreatedUpdated {
  @Property()
  @Index()
  identifier!: string

  @Property({ type: 'text' })
  value!: string

  @Property()
  expiresAt!: Date
}
