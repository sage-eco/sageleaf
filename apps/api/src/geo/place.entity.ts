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
} from '@mikro-orm/core'
import type { Ref } from '@mikro-orm/core'

import type { TranslatedField } from '@src/common/i18n'
import { type JSONObject, type Rank, RANK_ORDER_SQL } from '@src/common/z.schema'
import { CreatedUpdated } from '@src/db/base.entity'
import { Point, PointType } from '@src/db/custom.types'
import { Process } from '@src/process/process.entity'
import { Tag } from '@src/process/tag.entity'
import { Org } from '@src/users/org.entity'
import { User } from '@src/users/users.entity'

@Entity({ tableName: 'places', schema: 'public' })
@Index({ properties: ['location'], type: 'gist' })
@Index({
  name: 'places_rank_order_idx',
  expression: `create index "places_rank_order_idx" on "places" (rank_order desc, id desc)`,
})
export class Place extends CreatedUpdated {
  [OptionalProps]?: 'rankOrder'

  @PrimaryKey()
  id!: string

  @Property({ type: 'json' })
  name!: TranslatedField

  @Property({ type: 'json' })
  address?: TranslatedField

  @Property({ type: 'json' })
  desc?: TranslatedField

  @Property({ type: PointType })
  location!: Point

  @ManyToOne()
  org?: Ref<Org>

  @Property({ type: 'json' })
  osm?: {}

  @Property({ type: 'json' })
  rank?: Rank

  @Property({ type: 'double precision', generated: `(${RANK_ORDER_SQL}) stored`, nullable: false })
  rankOrder!: number

  @ManyToMany({ entity: () => Tag, pivotEntity: () => PlacesTag })
  tags = new Collection<Tag>(this)

  @OneToMany({
    entity: () => PlacesTag,
    mappedBy: (pt) => pt.place,
    orphanRemoval: true,
  })
  place_tags = new Collection<PlacesTag>(this)

  @OneToMany({ mappedBy: 'place' })
  processes = new Collection<Process>(this)

  @OneToMany({ mappedBy: 'place' })
  history = new Collection<PlaceHistory>(this)
}

@Entity({ tableName: 'places_tags', schema: 'public' })
export class PlacesTag extends BaseEntity {
  @ManyToOne({ primary: true })
  place!: Place

  @ManyToOne({ primary: true })
  tag!: Tag & {}

  @Property({ type: 'json' })
  meta?: JSONObject
}

@Entity({ tableName: 'place_history', schema: 'public' })
export class PlaceHistory extends BaseEntity {
  @ManyToOne({ primary: true })
  place!: Place

  @PrimaryKey()
  datetime!: Date;

  [PrimaryKeyProp]?: ['place', 'datetime']

  @ManyToOne()
  user!: Ref<User>

  @Property({ type: 'json' })
  original?: JSONObject

  @Property({ type: 'json' })
  changes?: JSONObject
}
