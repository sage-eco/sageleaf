import { BaseEntity, Entity, Index, ManyToOne, PrimaryKey, Property } from '@mikro-orm/postgresql'

import { Session } from '@src/auth/session.entity'
import { generateID } from '@src/db/base.entity'
import { User } from '@src/users/users.entity'

@Entity({ tableName: 'oauth_refresh_tokens', schema: 'auth' })
export class OauthRefreshToken extends BaseEntity {
  constructor() {
    super()
    this.id = generateID()
    this.createdAt = new Date()
  }

  @PrimaryKey()
  id: string

  @Property()
  @Index()
  token!: string

  @Property({ fieldName: 'client_id' })
  @Index()
  clientId!: string

  @ManyToOne(() => Session, { nullable: true, deleteRule: 'set null' })
  @Index()
  session?: Session

  @ManyToOne(() => User)
  @Index()
  user!: User

  @Property({ fieldName: 'reference_id', nullable: true })
  referenceId?: string

  @Property({ type: 'json' })
  scopes!: string[]

  @Property({ nullable: true })
  revoked?: Date

  @Property({ fieldName: 'auth_time', nullable: true })
  authTime?: Date

  @Property({ fieldName: 'created_at', defaultRaw: 'current_timestamp()' })
  createdAt: Date

  @Property({ fieldName: 'expires_at' })
  expiresAt!: Date
}
