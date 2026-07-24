import { Entity, Index, ManyToOne, Property } from '@mikro-orm/postgresql'

import { IDCreatedUpdated } from '@src/db/base.entity'
import { User } from '@src/users/users.entity'

@Entity({ tableName: 'oauth_clients', schema: 'auth' })
export class OauthClient extends IDCreatedUpdated {
  @Property({ fieldName: 'client_id' })
  @Index()
  clientId!: string

  @Property({ fieldName: 'client_secret', nullable: true })
  clientSecret?: string

  @Property({ nullable: true })
  disabled?: boolean

  @Property({ fieldName: 'skip_consent', nullable: true })
  skipConsent?: boolean

  @Property({ fieldName: 'enable_end_session', nullable: true })
  enableEndSession?: boolean

  @Property({ fieldName: 'subject_type', nullable: true })
  subjectType?: string

  @Property({ type: 'array', nullable: true })
  scopes?: string[]

  @ManyToOne(() => User, { nullable: true })
  @Index()
  user?: User

  @Property({ fieldName: 'reference_id', nullable: true })
  @Index()
  referenceId?: string

  @Property({ nullable: true })
  name?: string

  @Property({ nullable: true })
  uri?: string

  @Property({ nullable: true })
  icon?: string

  @Property({ type: 'array', nullable: true })
  contacts?: string[]

  @Property({ nullable: true })
  tos?: string

  @Property({ nullable: true })
  policy?: string

  @Property({ fieldName: 'software_id', nullable: true })
  softwareId?: string

  @Property({ fieldName: 'software_version', nullable: true })
  softwareVersion?: string

  @Property({ fieldName: 'software_statement', type: 'text', nullable: true })
  softwareStatement?: string

  @Property({ fieldName: 'redirect_uris', type: 'array' })
  redirectUris!: string[]

  @Property({ fieldName: 'post_logout_redirect_uris', type: 'array', nullable: true })
  postLogoutRedirectUris?: string[]

  @Property({ fieldName: 'token_endpoint_auth_method', nullable: true })
  tokenEndpointAuthMethod?: string

  @Property({ fieldName: 'grant_types', type: 'array', nullable: true })
  grantTypes?: string[]

  @Property({ fieldName: 'response_types', type: 'array', nullable: true })
  responseTypes?: string[]

  @Property({ nullable: true })
  public?: boolean

  @Property({ nullable: true })
  type?: string

  @Property({ fieldName: 'require_pkce', nullable: true })
  requirePKCE?: boolean

  @Property({ type: 'json', nullable: true })
  metadata?: Record<string, unknown>
}
