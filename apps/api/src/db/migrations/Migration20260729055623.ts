// this file was generated, do not edit unless creating a new migration

import { Migration } from '@mikro-orm/migrations'

export class Migration20260729055623 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`alter table "tags"
                 drop constraint if exists "check_type";`)

    this.addSql(`alter table "tags"
                 drop constraint if exists "tags_type_check2";`)

    this.addSql(`alter table "tags"
                 drop constraint if exists "tags_type_check";`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "tags"
                 add constraint "tags_type_check" check (
                   "type" in (
                     'PLACE',
                     'ITEM',
                     'VARIANT',
                     'COMPONENT',
                     'PROCESS',
                     'PROGRAM',
                     'ORG'
                   )
                 );`)

    this.addSql(`alter table "tags"
                 add constraint "tags_type_check2" check (
                   "type" in (
                     'PLACE',
                     'ITEM',
                     'VARIANT',
                     'COMPONENT',
                     'PROCESS',
                     'ORG'
                   )
                 );`)

    this.addSql(`alter table "tags"
                 add constraint "check_type" check (
                   "type" in (
                     'PLACE',
                     'VARIANT',
                     'COMPONENT'
                   )
                 );`)
  }
}
