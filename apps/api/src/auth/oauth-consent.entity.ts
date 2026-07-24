import { Entity, Index, ManyToOne, Property } from '@mikro-orm/postgresql'

import { IDCreatedUpdated } from '@src/db/base.entity'
import { User } from '@src/users/users.entity'

@Entity({ tableName: 'oauth_consents', schema: 'auth' })
export class OauthConsent extends IDCreatedUpdated {
  @ManyToOne(() => User)
  @Index()
  user!: User

  @Property({ fieldName: 'client_id' })
  @Index()
  clientId!: string

  @Property({ fieldName: 'reference_id', nullable: true })
  referenceId?: string

  @Property({ type: 'json' })
  scopes!: string[]
}
