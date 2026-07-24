import {
  BaseEntity,
  Collection,
  Entity,
  Index,
  ManyToMany,
  ManyToOne,
  OneToMany,
  type Opt,
  OptionalProps,
  PrimaryKey,
  PrimaryKeyProp,
  Property,
  type Ref,
} from '@mikro-orm/core'
import { z } from 'zod/v4'

import { Source } from '@src/changes/source.entity'
import { type TranslatedField } from '@src/common/i18n'
import { type JSONObject, type Rank, RANK_ORDER_SQL } from '@src/common/z.schema'
import { IDCreatedUpdated } from '@src/db/base.entity'
import { Region } from '@src/geo/region.entity'
import { Component } from '@src/process/component.entity'
import { Tag } from '@src/process/tag.entity'
import { Item } from '@src/product/item.entity'
import { Org } from '@src/users/org.entity'
import { User } from '@src/users/users.entity'

export const VariantComponentUnitSchema = z.enum(['g', 'ml']).optional()

export enum VariantComponentUnit {
  GRAMS = 'g',
  LITERS = 'ml',
}

export const VariantOrgRoleSchema = z.enum(['PRODUCER', 'DISTRIBUTOR']).optional()

export type VariantOrgRole = z.infer<typeof VariantOrgRoleSchema>

@Entity({ tableName: 'variants', schema: 'public' })
@Index({
  name: 'variants_rank_order_idx',
  expression: `create index "variants_rank_order_idx" on "variants" (rank_order desc, id desc)`,
})
export class Variant extends IDCreatedUpdated {
  [OptionalProps]?: 'rankOrder'

  @Property({ type: 'json' })
  name!: TranslatedField

  @Property({ type: 'json' })
  desc?: TranslatedField

  @ManyToMany({ entity: () => Source, pivotEntity: () => VariantsSources })
  sources = new Collection<Source>(this)

  @OneToMany(() => VariantsSources, (vs) => vs.variant)
  variantSources = new Collection<VariantsSources>(this)

  @ManyToMany({ entity: () => Item, pivotEntity: () => VariantsItems })
  items = new Collection<Item>(this)

  @OneToMany(() => VariantsItems, (vi) => vi.variant)
  variantItems = new Collection<VariantsItems>(this)

  @ManyToOne()
  region?: Ref<Region>

  @Property({ type: 'array' })
  regions?: string[]

  @Property({ index: true })
  code?: string

  @Property({ type: 'json' })
  rank?: Rank

  @Property({ type: 'double precision', generated: `(${RANK_ORDER_SQL}) stored`, nullable: false })
  rankOrder!: number

  @ManyToMany({ entity: () => Org, pivotEntity: () => VariantsOrgs })
  orgs = new Collection<Org>(this)

  @OneToMany({
    entity: () => VariantsOrgs,
    mappedBy: (vo) => vo.variant,
    orphanRemoval: true,
  })
  variantOrgs = new Collection<VariantsOrgs>(this)

  @ManyToMany({ entity: () => Tag, pivotEntity: () => VariantsTags })
  tags = new Collection<Tag>(this)

  @OneToMany({
    entity: () => VariantsTags,
    mappedBy: (vt) => vt.variant,
    orphanRemoval: true,
  })
  variantTags = new Collection<VariantsTags>(this)

  @ManyToMany({
    entity: () => Component,
    pivotEntity: () => VariantsComponents,
  })
  components = new Collection<Component>(this)

  @OneToMany({
    entity: () => VariantsComponents,
    mappedBy: (vc) => vc.variant,
    orphanRemoval: true,
  })
  variantComponents = new Collection<VariantsComponents>(this)

  @OneToMany(() => VariantHistory, (history) => history.variant)
  history = new Collection<VariantHistory>(this)
}

@Entity({ tableName: 'variants_sources', schema: 'public' })
export class VariantsSources extends BaseEntity {
  @ManyToOne({ primary: true })
  variant!: Variant

  @ManyToOne({ primary: true })
  source!: Source & {}

  // Metadata contains key value pairs for the connected
  // source. For example: There is a single source for an API, but
  // here the metadata contains an important string provided by that API.
  // This can be used to format links directly to the source.
  // If we just need external IDs, we use the ExternalSource entity.
  @Property({ type: 'json' })
  meta?: Record<string, any>
}

@Entity({ tableName: 'variants_items', schema: 'public' })
export class VariantsItems extends BaseEntity {
  @ManyToOne({ primary: true })
  variant!: Variant

  @ManyToOne({ primary: true })
  item!: Item & {}
}

@Entity({ tableName: 'variants_tags', schema: 'public' })
export class VariantsTags extends BaseEntity {
  @ManyToOne({ primary: true })
  variant!: Variant

  @ManyToOne({ primary: true })
  tag!: Tag & {}

  @Property({ type: 'json' })
  meta?: Record<string, any>
}

@Entity({ tableName: 'variants_components', schema: 'public' })
export class VariantsComponents extends BaseEntity {
  @ManyToOne({ primary: true })
  variant!: Variant

  @ManyToOne({ primary: true })
  component!: Component & {}

  @Property({ type: 'numeric', precision: 16, scale: 6 })
  quantity: number & Opt = 1

  @Property({ type: 'string' })
  unit?: VariantComponentUnit
}

@Entity({ tableName: 'variants_orgs', schema: 'public' })
export class VariantsOrgs extends BaseEntity {
  @ManyToOne({ primary: true, deleteRule: 'cascade' })
  variant!: Variant

  @ManyToOne({ primary: true, deleteRule: 'cascade' })
  org!: Org & {}

  @Property({ type: 'string' })
  role?: VariantOrgRole

  @ManyToOne()
  region?: Ref<Region>
}

@Entity({ tableName: 'variant_history', schema: 'public' })
export class VariantHistory extends BaseEntity {
  @ManyToOne({ primary: true })
  variant!: Variant

  @PrimaryKey()
  datetime!: Date;

  [PrimaryKeyProp]?: ['variant', 'datetime']

  @ManyToOne()
  user!: Ref<User>

  @Property({ type: 'json' })
  original?: JSONObject

  @Property({ type: 'json' })
  changes?: JSONObject
}
