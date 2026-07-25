import { BaseEntity, Entity, PrimaryKey, Property } from '@mikro-orm/postgresql'

import { generateID } from '@src/db/base.entity'

@Entity({ tableName: 'jwks', schema: 'auth' })
export class Jwks extends BaseEntity {
  constructor() {
    super()
    this.id = generateID()
    this.createdAt = new Date()
  }

  @PrimaryKey()
  id: string

  @Property({ fieldName: 'public_key', type: 'text' })
  publicKey!: string

  @Property({ fieldName: 'private_key', type: 'text' })
  privateKey!: string

  @Property({ fieldName: 'created_at', defaultRaw: 'current_timestamp()' })
  createdAt: Date

  @Property({ fieldName: 'expires_at', nullable: true })
  expiresAt?: Date
}
