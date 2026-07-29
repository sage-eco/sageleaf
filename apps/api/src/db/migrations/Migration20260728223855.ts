// this file was generated, do not edit unless creating a new migration

import { Migration } from '@mikro-orm/migrations'

export class Migration20260728223855 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create index "changes_updated_at_idx" on "changes" (updated_at desc, id desc);`)
  }

  override async down(): Promise<void> {
    this.addSql(`drop index "changes_updated_at_idx";`)
  }
}
