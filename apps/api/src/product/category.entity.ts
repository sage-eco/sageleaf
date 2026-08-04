import {
  BaseEntity,
  Collection,
  Entity,
  Filter,
  Index,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OptionalProps,
  PrimaryKey,
  PrimaryKeyProp,
  Property,
} from '@mikro-orm/core'
import type { Ref } from '@mikro-orm/core'
import { raw } from '@mikro-orm/postgresql'

import { ExcludeFromDiff } from '@src/common/exclude-from-diff.decorator'
import type { TranslatedField } from '@src/common/i18n'
import { type Rank, RANK_ORDER_SQL } from '@src/common/z.schema'
import { IDCreatedUpdated } from '@src/db/base.entity'
import { Item } from '@src/product/item.entity'
import { User } from '@src/users/users.entity'

export const CATEGORY_ROOT = 'CATEGORY_ROOT'

@Entity({ tableName: 'categories', schema: 'public' })
@Index({
  name: 'categories_rank_order_idx',
  expression: `create index "categories_rank_order_idx" on "categories" (rank_order desc, id desc)`,
})
@Filter({
  name: 'rankOrderCursor',
  cond: (args: { cmp: '$gte' | '$lte'; order: number; id: string }) => ({
    [raw('(rank_order, id)')]: { [args.cmp]: raw('(?, ?)', [args.order, args.id]) },
  }),
})
export class Category extends IDCreatedUpdated {
  [OptionalProps]?: 'rankOrder'

  @Property({ type: 'json' })
  name!: TranslatedField

  @Property({ type: 'json' })
  descShort?: TranslatedField

  @Property({ type: 'json' })
  desc?: TranslatedField

  @Property({ nullable: true })
  imageURL?: string

  @ExcludeFromDiff()
  @Property({ type: 'json' })
  rank?: Rank

  @ExcludeFromDiff()
  @Property({ type: 'double precision', generated: `(${RANK_ORDER_SQL}) stored`, nullable: false })
  rankOrder!: number

  @OneToMany({ entity: () => CategoryTree, mappedBy: 'ancestor' })
  ancestors = new Collection<CategoryTree>(this)

  @OneToMany(() => CategoryTree, (tree) => tree.descendant)
  descendants = new Collection<CategoryTree>(this)

  @OneToMany(() => CategoryEdge, (edge) => edge.parent)
  parents = new Collection<CategoryEdge>(this)

  @OneToMany(() => CategoryEdge, (edge) => edge.child)
  children = new Collection<CategoryEdge>(this)

  @ManyToMany({
    entity: () => 'Item',
    mappedBy: (item: Item) => item.categories,
  })
  items = new Collection<Item>(this)

  @OneToMany(() => CategoryHistory, (history) => history.category)
  history = new Collection<CategoryHistory>(this)
}

@Entity({
  tableName: 'category_tree',
  schema: 'public',
})
@Index({ properties: ['ancestor', 'descendant', 'depth'] })
@Index({ properties: ['descendant', 'depth'] })
export class CategoryTree extends BaseEntity {
  @ManyToOne({ primary: true })
  ancestor!: Category

  @ManyToOne({ primary: true })
  descendant!: Category

  @Property({ type: 'number', default: 0 })
  depth!: string
}

@Entity({ tableName: 'category_edges', schema: 'public' })
export class CategoryEdge extends BaseEntity {
  @ManyToOne({ primary: true })
  parent!: Category

  @ManyToOne({ primary: true, index: true })
  child!: Category
}

@Entity({ tableName: 'category_history', schema: 'public' })
export class CategoryHistory extends BaseEntity {
  @ManyToOne(() => Category, { primary: true })
  category!: Category

  @PrimaryKey()
  datetime!: Date;

  [PrimaryKeyProp]?: ['category', 'datetime']

  @ManyToOne()
  user!: Ref<User>

  @Property({ type: 'json' })
  original?: Record<string, any>

  @Property({ type: 'json' })
  changes?: Record<string, any>
}
