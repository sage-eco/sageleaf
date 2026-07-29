import {
  BaseEntity,
  Collection,
  Entity,
  Index,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OptionalProps,
  PrimaryKey,
  PrimaryKeyProp,
  Property,
  type Ref,
} from '@mikro-orm/core'
import { z } from 'zod/v4'

import { ExcludeFromDiff } from '@src/common/exclude-from-diff.decorator'
import { type TranslatedField } from '@src/common/i18n'
import { type Rank, RANK_ORDER_SQL } from '@src/common/z.schema'
import { IDCreatedUpdated } from '@src/db/base.entity'
import { Tag } from '@src/process/tag.entity'
import { Category } from '@src/product/category.entity'
import { Variant } from '@src/product/variant.entity'
import { User } from '@src/users/users.entity'

export const ItemFilesSchema = z.object({
  thumbnail: z.url().optional(),
  images: z
    .array(
      z.object({
        url: z.url(),
      }),
    )
    .optional(),
})

export type ItemFiles = z.infer<typeof ItemFilesSchema>

@Entity({ tableName: 'items', schema: 'public' })
@Index({
  name: 'items_rank_order_idx',
  expression: `create index "items_rank_order_idx" on "items" (rank_order desc, id desc)`,
})
export class Item extends IDCreatedUpdated {
  [OptionalProps]?: 'rankOrder'

  @Property({ type: 'json' })
  name!: TranslatedField

  @Property({ type: 'json' })
  desc?: TranslatedField

  @Property({ type: 'json' })
  source!: {}

  @Property({ type: 'json' })
  files?: ItemFiles

  @Property({ type: 'json' })
  links?: {}

  @ExcludeFromDiff()
  @Property({ type: 'json' })
  rank?: Rank

  @ExcludeFromDiff()
  @Property({ type: 'double precision', generated: `(${RANK_ORDER_SQL}) stored`, nullable: false })
  rankOrder!: number

  @ManyToMany({ entity: () => Category, pivotEntity: () => ItemsCategories })
  categories = new Collection<Category>(this)

  @OneToMany({
    entity: () => ItemsCategories,
    mappedBy: (it) => it.item,
    orphanRemoval: true,
  })
  itemCategories = new Collection<ItemsCategories>(this)

  @ManyToMany({ entity: () => Tag, pivotEntity: () => ItemsTags })
  tags = new Collection<Tag>(this)

  @OneToMany({
    entity: () => ItemsTags,
    mappedBy: (it) => it.item,
    orphanRemoval: true,
  })
  itemTags = new Collection<ItemsTags>(this)

  @ManyToMany({ entity: () => Variant, mappedBy: 'items' })
  variants = new Collection<Variant>(this)

  @OneToMany({ mappedBy: 'item' })
  history = new Collection<ItemHistory>(this)
}

@Entity({ tableName: 'items_categories', schema: 'public' })
export class ItemsCategories {
  @ManyToOne({ primary: true })
  item!: Item

  @ManyToOne({ primary: true })
  category!: Category
}

@Entity({ tableName: 'items_tags', schema: 'public' })
export class ItemsTags extends BaseEntity {
  @ManyToOne({ primary: true })
  item!: Item

  @ManyToOne({ primary: true })
  tag!: Tag & {}

  @Property({ type: 'json' })
  meta?: Record<string, any>
}

@Entity({ tableName: 'item_history', schema: 'public' })
export class ItemHistory extends BaseEntity {
  @ManyToOne({ primary: true })
  item!: Item

  @PrimaryKey()
  datetime!: Date;

  [PrimaryKeyProp]?: ['item', 'datetime']

  @ManyToOne()
  user!: Ref<User>

  @Property({ type: 'json' })
  original?: Record<string, any>

  @Property({ type: 'json' })
  changes?: Record<string, any>
}
