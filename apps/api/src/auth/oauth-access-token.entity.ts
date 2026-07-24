import { BaseEntity, Entity, Index, ManyToOne, PrimaryKey, Property } from '@mikro-orm/postgresql'

import { OauthRefreshToken } from '@src/auth/oauth-refresh-token.entity'
import { Session } from '@src/auth/session.entity'
import { generateID } from '@src/db/base.entity'
import { User } from '@src/users/users.entity'

@Entity({ tableName: 'oauth_access_tokens', schema: 'auth' })
export class OauthAccessToken extends BaseEntity {
  constructor() {
    super()
    this.id = generateID()
    this.createdAt = new Date()
  }

  @PrimaryKey()
  id: string

  @Property({ unique: true })
  token!: string

  @Property({ fieldName: 'client_id' })
  @Index()
  clientId!: string

  @ManyToOne(() => Session, { nullable: true, deleteRule: 'set null' })
  @Index()
  session?: Session

  @ManyToOne(() => OauthRefreshToken, { nullable: true, fieldName: 'refresh_id' })
  @Index()
  refresh?: OauthRefreshToken

  @ManyToOne(() => User, { nullable: true })
  @Index()
  user?: User

  @Property({ fieldName: 'reference_id', nullable: true })
  referenceId?: string

  @Property({ type: 'array' })
  scopes!: string[]

  @Property({ fieldName: 'created_at', defaultRaw: 'current_timestamp()' })
  createdAt: Date

  @Property({ fieldName: 'expires_at' })
  expiresAt!: Date
}
