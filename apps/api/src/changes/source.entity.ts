import { Collection, Entity, Enum, ManyToMany, ManyToOne, Property } from '@mikro-orm/core'
import type { Ref } from '@mikro-orm/core'
import { z } from 'zod/v4'

import { Change } from '@src/changes/change.entity'
import { IDCreatedUpdated } from '@src/db/base.entity'
import { Component } from '@src/process/component.entity'
import { Process } from '@src/process/process.entity'
import { Variant } from '@src/product/variant.entity'
import { Org } from '@src/users/org.entity'
import { User } from '@src/users/users.entity'

export enum SourceType {
  API = 'API',
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  PDF = 'PDF',
  URL = 'URL',
  FILE = 'FILE',
  VIDEO = 'VIDEO',
  OTHER = 'OTHER',
}

export const ContentSchema = z.object({
  text: z.string().optional(),
  context: z.string().optional(),
  icon: z.string().optional(),
  jsonld: z.json().optional(),
})

export type Content = z.infer<typeof ContentSchema>

export const SourceMetadataSchema = z.object({
  extra: z.record(z.string(), z.json()).optional(),
})
export type SourceMetadata = z.infer<typeof SourceMetadataSchema>

@Entity({ tableName: 'sources', schema: 'public' })
export class Source extends IDCreatedUpdated {
  @Enum(() => SourceType)
  type!: SourceType

  @Property()
  processedAt?: Date

  @Property()
  location?: string

  @Property({ type: 'json', nullable: true })
  content?: Content

  @Property()
  contentURL?: string

  @ManyToOne(() => User)
  user!: Ref<User>

  @ManyToMany({ entity: () => Change, mappedBy: 'sources' })
  changes = new Collection<Change>(this)

  @ManyToMany({ entity: () => Component, mappedBy: 'sources' })
  components = new Collection<Component>(this)

  @ManyToMany({ entity: () => Process, mappedBy: 'sources' })
  processes = new Collection<Process>(this)

  @ManyToMany({ entity: () => Variant, mappedBy: 'sources' })
  variants = new Collection<Variant>(this)

  @Property({ type: 'json', nullable: true })
  metadata?: SourceMetadata
}

@Entity({ tableName: 'external_sources', schema: 'public' })
export class ExternalSource {
  @Property({ primary: true })
  source!: string

  @Property({ primary: true })
  source_id!: string

  @ManyToOne(() => Org)
  org?: Ref<Org>

  @ManyToOne(() => Variant)
  variant?: Ref<Variant>

  @ManyToOne(() => Component)
  component?: Ref<Component>

  @ManyToOne(() => Process)
  process?: Ref<Process>
}
