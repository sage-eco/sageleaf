import {
  Collection,
  Entity,
  Enum,
  Index,
  ManyToMany,
  OptionalProps,
  Property,
  Unique,
} from '@mikro-orm/core'
import { JSONSchemaType } from 'ajv/dist/2020'
import { z } from 'zod/v4'

import { ExcludeFromDiff } from '@src/common/exclude-from-diff.decorator'
import { type TranslatedField } from '@src/common/i18n'
import {
  AjvTemplateSchema,
  JSONType,
  type Rank,
  RANK_ORDER_SQL,
  ZTranslatedField,
} from '@src/common/z.schema'
import { IDCreatedUpdated } from '@src/db/base.entity'
import { Place } from '@src/geo/place.entity'
import { Component } from '@src/process/component.entity'
import { Program } from '@src/process/program.entity'
import { Item } from '@src/product/item.entity'
import { Variant } from '@src/product/variant.entity'

export enum TagType {
  PLACE = 'PLACE',
  ITEM = 'ITEM',
  VARIANT = 'VARIANT',
  COMPONENT = 'COMPONENT',
  PROCESS = 'PROCESS',
  PROGRAM = 'PROGRAM',
  ORG = 'ORG',
}

export interface TagMetaTemplate {
  schema?: JSONType
  uischema?: JSONType
}
export const TagMetaTemplateSchema = z
  .object({
    schema: z.json().optional(),
    uischema: z.json().optional(),
  })
  .refine(
    (data) => {
      try {
        AjvTemplateSchema.compile(data.schema as JSONSchemaType<any>)
      } catch (e) {
        return false
      }
      return true
    },
    { error: 'Invalid JSON Schema in meta template' },
  )

export enum TagCaveatLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

export const TagCaveatSchema = z.object({
  level: z.enum(TagCaveatLevel),
  name: ZTranslatedField.optional(),
  desc: ZTranslatedField.optional(),
})

export const TagRulesSchema = z
  .object({
    recycle: z
      .array(
        z.object({
          caveat: TagCaveatSchema.optional(),
        }),
      )
      .optional(),
  })
  .optional()

export type TagRules = z.infer<typeof TagRulesSchema>

@Entity({ tableName: 'tags', schema: 'public' })
@Unique({ properties: ['type', 'tag_id'] })
@Index({
  name: 'tags_rank_order_idx',
  expression: `create index "tags_rank_order_idx" on "tags" (rank_order desc, id desc)`,
})
export class Tag extends IDCreatedUpdated {
  [OptionalProps]?: 'rankOrder'

  @Property({ type: 'json' })
  name!: TranslatedField

  @Enum(() => TagType)
  type!: TagType

  @Property({ type: 'json' })
  desc?: TranslatedField

  @Property({ type: 'json' })
  metaTemplate?: TagMetaTemplate

  @Property()
  bgColor?: string

  @Property()
  image?: string

  @Property()
  tag_id?: string

  @Property({ type: 'json' })
  rules?: TagRules

  @ExcludeFromDiff()
  @Property({ type: 'json' })
  rank?: Rank

  @ExcludeFromDiff()
  @Property({ type: 'double precision', generated: `(${RANK_ORDER_SQL}) stored`, nullable: false })
  rankOrder!: number

  @ManyToMany({ entity: () => Place, mappedBy: 'tags' })
  places = new Collection<Place>(this)

  @ManyToMany({ entity: () => Item, mappedBy: 'tags' })
  items = new Collection<Item>(this)

  @ManyToMany({ entity: () => Variant, mappedBy: 'tags' })
  variants = new Collection<Variant>(this)

  @ManyToMany({ entity: () => Component, mappedBy: 'tags' })
  components = new Collection<Component>(this)

  @ManyToMany({ entity: () => Program, mappedBy: 'tags' })
  programs = new Collection<Program>(this)

  meta?: Record<string, any>
}
