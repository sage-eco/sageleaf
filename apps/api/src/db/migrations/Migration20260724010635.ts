// this file was generated, do not edit unless creating a new migration

import { Migration } from '@mikro-orm/migrations'

export class Migration20260724010635 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "categories"
                 add column "rank_order" double precision generated always as (coalesce((rank ->> 'order')::double precision, 0.0)) stored not null;`)
    this.addSql(
      `create index "categories_rank_order_idx" on "categories" (rank_order desc, id desc);`,
    )

    this.addSql(`alter table "items"
                 add column "rank_order" double precision generated always as (coalesce((rank ->> 'order')::double precision, 0.0)) stored not null;`)
    this.addSql(`create index "items_rank_order_idx" on "items" (rank_order desc, id desc);`)

    this.addSql(`alter table "orgs"
                 add column "rank_order" double precision generated always as (coalesce((rank ->> 'order')::double precision, 0.0)) stored not null;`)
    this.addSql(`create index "orgs_rank_order_idx" on "orgs" (rank_order desc, id desc);`)

    this.addSql(`alter table "places"
                 add column "rank_order" double precision generated always as (coalesce((rank ->> 'order')::double precision, 0.0)) stored not null;`)
    this.addSql(`create index "places_rank_order_idx" on "places" (rank_order desc, id desc);`)

    this.addSql(`alter table "programs"
                 add column "rank_order" double precision generated always as (coalesce((rank ->> 'order')::double precision, 0.0)) stored not null;`)
    this.addSql(`create index "programs_rank_order_idx" on "programs" (rank_order desc, id desc);`)

    this.addSql(`alter table "components"
                 add column "rank_order" double precision generated always as (coalesce((rank ->> 'order')::double precision, 0.0)) stored not null;`)
    this.addSql(
      `create index "components_rank_order_idx" on "components" (rank_order desc, id desc);`,
    )

    this.addSql(`alter table "tags"
                 add column "rank_order" double precision generated always as (coalesce((rank ->> 'order')::double precision, 0.0)) stored not null;`)
    this.addSql(`create index "tags_rank_order_idx" on "tags" (rank_order desc, id desc);`)

    this.addSql(`alter table "users"
                 add column "rank_order" double precision generated always as (coalesce((rank ->> 'order')::double precision, 0.0)) stored not null;`)
    this.addSql(`create index "users_rank_order_idx" on "users" (rank_order desc, id desc);`)

    this.addSql(`alter table "variants"
                 add column "rank_order" double precision generated always as (coalesce((rank ->> 'order')::double precision, 0.0)) stored not null;`)
    this.addSql(`create index "variants_rank_order_idx" on "variants" (rank_order desc, id desc);`)

    this.addSql(`alter table "processes"
                 add column "rank_order" double precision generated always as (coalesce((rank ->> 'order')::double precision, 0.0)) stored not null;`)
    this.addSql(
      `create index "processes_rank_order_idx" on "processes" (rank_order desc, id desc);`,
    )
  }

  override async down(): Promise<void> {
    this.addSql(`drop index "categories_rank_order_idx";`)
    this.addSql(`alter table "categories"
                 drop column "rank_order";`)

    this.addSql(`drop index "items_rank_order_idx";`)
    this.addSql(`alter table "items"
                 drop column "rank_order";`)

    this.addSql(`drop index "orgs_rank_order_idx";`)
    this.addSql(`alter table "orgs"
                 drop column "rank_order";`)

    this.addSql(`drop index "places_rank_order_idx";`)
    this.addSql(`alter table "places"
                 drop column "rank_order";`)

    this.addSql(`drop index "programs_rank_order_idx";`)
    this.addSql(`alter table "programs"
                 drop column "rank_order";`)

    this.addSql(`drop index "components_rank_order_idx";`)
    this.addSql(`alter table "components"
                 drop column "rank_order";`)

    this.addSql(`drop index "tags_rank_order_idx";`)
    this.addSql(`alter table "tags"
                 drop column "rank_order";`)

    this.addSql(`drop index "users_rank_order_idx";`)
    this.addSql(`alter table "users"
                 drop column "rank_order";`)

    this.addSql(`drop index "variants_rank_order_idx";`)
    this.addSql(`alter table "variants"
                 drop column "rank_order";`)

    this.addSql(`drop index "processes_rank_order_idx";`)
    this.addSql(`alter table "processes"
                 drop column "rank_order";`)
  }
}
