// this file was generated, do not edit unless creating a new migration

import { Migration } from '@mikro-orm/migrations'

export class Migration20260724224449 extends Migration {
  override async up(): Promise<void> {
    this.addSql(`create table "auth"."jwks" (
                   "id" varchar(255) not null,
                   "public_key" text not null,
                   "private_key" text not null,
                   "created_at" timestamptz not null default current_timestamp(),
                   "expires_at" timestamptz null,
                   constraint "jwks_pkey" primary key ("id")
                 );`)

    this.addSql(`create table "auth"."oauth_refresh_tokens" (
                   "id" varchar(255) not null,
                   "token" varchar(255) not null,
                   "client_id" varchar(255) not null,
                   "session_id" varchar(255) null,
                   "user_id" varchar(255) not null,
                   "reference_id" varchar(255) null,
                   "scopes" jsonb not null,
                   "revoked" timestamptz null,
                   "auth_time" timestamptz null,
                   "created_at" timestamptz not null default current_timestamp(),
                   "expires_at" timestamptz not null,
                   constraint "oauth_refresh_tokens_pkey" primary key ("id")
                 );`)
    this.addSql(
      `create index "oauth_refresh_tokens_token_index" on "auth"."oauth_refresh_tokens" ("token");`,
    )
    this.addSql(
      `create index "oauth_refresh_tokens_client_id_index" on "auth"."oauth_refresh_tokens" ("client_id");`,
    )
    this.addSql(
      `create index "oauth_refresh_tokens_session_id_index" on "auth"."oauth_refresh_tokens" ("session_id");`,
    )
    this.addSql(
      `create index "oauth_refresh_tokens_user_id_index" on "auth"."oauth_refresh_tokens" ("user_id");`,
    )

    this.addSql(`create table "auth"."oauth_consents" (
                   "id" varchar(255) not null,
                   "created_at" timestamptz not null default current_timestamp(),
                   "updated_at" timestamptz not null default current_timestamp(),
                   "user_id" varchar(255) not null,
                   "client_id" varchar(255) not null,
                   "reference_id" varchar(255) null,
                   "scopes" jsonb not null,
                   constraint "oauth_consents_pkey" primary key ("id")
                 );`)
    this.addSql(
      `create index "oauth_consents_user_id_index" on "auth"."oauth_consents" ("user_id");`,
    )
    this.addSql(
      `create index "oauth_consents_client_id_index" on "auth"."oauth_consents" ("client_id");`,
    )

    this.addSql(`create table "auth"."oauth_clients" (
                   "id" varchar(255) not null,
                   "created_at" timestamptz not null default current_timestamp(),
                   "updated_at" timestamptz not null default current_timestamp(),
                   "client_id" varchar(255) not null,
                   "client_secret" varchar(255) null,
                   "disabled" boolean null,
                   "skip_consent" boolean null,
                   "enable_end_session" boolean null,
                   "subject_type" varchar(255) null,
                   "scopes" jsonb null,
                   "user_id" varchar(255) null,
                   "reference_id" varchar(255) null,
                   "name" varchar(255) null,
                   "uri" varchar(255) null,
                   "icon" varchar(255) null,
                   "contacts" jsonb null,
                   "tos" varchar(255) null,
                   "policy" varchar(255) null,
                   "software_id" varchar(255) null,
                   "software_version" varchar(255) null,
                   "software_statement" text null,
                   "redirect_uris" jsonb not null,
                   "post_logout_redirect_uris" jsonb null,
                   "token_endpoint_auth_method" varchar(255) null,
                   "grant_types" jsonb null,
                   "response_types" jsonb null,
                   "public" boolean null,
                   "type" varchar(255) null,
                   "require_pkce" boolean null,
                   "metadata" jsonb null,
                   constraint "oauth_clients_pkey" primary key ("id")
                 );`)
    this.addSql(
      `create index "oauth_clients_client_id_index" on "auth"."oauth_clients" ("client_id");`,
    )
    this.addSql(`create index "oauth_clients_user_id_index" on "auth"."oauth_clients" ("user_id");`)
    this.addSql(
      `create index "oauth_clients_reference_id_index" on "auth"."oauth_clients" ("reference_id");`,
    )

    this.addSql(`create table "auth"."oauth_access_tokens" (
                   "id" varchar(255) not null,
                   "token" varchar(255) not null,
                   "client_id" varchar(255) not null,
                   "session_id" varchar(255) null,
                   "refresh_id" varchar(255) null,
                   "user_id" varchar(255) null,
                   "reference_id" varchar(255) null,
                   "scopes" jsonb not null,
                   "created_at" timestamptz not null default current_timestamp(),
                   "expires_at" timestamptz not null,
                   constraint "oauth_access_tokens_pkey" primary key ("id")
                 );`)
    this.addSql(`alter table "auth"."oauth_access_tokens"
                 add constraint "oauth_access_tokens_token_unique" unique ("token");`)
    this.addSql(
      `create index "oauth_access_tokens_client_id_index" on "auth"."oauth_access_tokens" ("client_id");`,
    )
    this.addSql(
      `create index "oauth_access_tokens_session_id_index" on "auth"."oauth_access_tokens" ("session_id");`,
    )
    this.addSql(
      `create index "oauth_access_tokens_refresh_id_index" on "auth"."oauth_access_tokens" ("refresh_id");`,
    )
    this.addSql(
      `create index "oauth_access_tokens_user_id_index" on "auth"."oauth_access_tokens" ("user_id");`,
    )

    this.addSql(`alter table "auth"."oauth_refresh_tokens"
                 add constraint "oauth_refresh_tokens_session_id_foreign" foreign key ("session_id") references "auth"."sessions" ("id") on update cascade on delete set null;`)
    this.addSql(`alter table "auth"."oauth_refresh_tokens"
                 add constraint "oauth_refresh_tokens_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade;`)

    this.addSql(`alter table "auth"."oauth_consents"
                 add constraint "oauth_consents_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade;`)

    this.addSql(`alter table "auth"."oauth_clients"
                 add constraint "oauth_clients_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete set null;`)

    this.addSql(`alter table "auth"."oauth_access_tokens"
                 add constraint "oauth_access_tokens_session_id_foreign" foreign key ("session_id") references "auth"."sessions" ("id") on update cascade on delete set null;`)
    this.addSql(`alter table "auth"."oauth_access_tokens"
                 add constraint "oauth_access_tokens_refresh_id_foreign" foreign key ("refresh_id") references "auth"."oauth_refresh_tokens" ("id") on update cascade on delete set null;`)
    this.addSql(`alter table "auth"."oauth_access_tokens"
                 add constraint "oauth_access_tokens_user_id_foreign" foreign key ("user_id") references "users" ("id") on update cascade on delete set null;`)

    this.addSql(`alter table "auth"."verifications"
                 alter column "value" type text using ("value"::text);`)
  }

  override async down(): Promise<void> {
    this.addSql(`alter table "auth"."oauth_access_tokens"
                 drop constraint "oauth_access_tokens_refresh_id_foreign";`)

    this.addSql(`drop table if exists "auth"."jwks" cascade;`)

    this.addSql(`drop table if exists "auth"."oauth_refresh_tokens" cascade;`)

    this.addSql(`drop table if exists "auth"."oauth_consents" cascade;`)

    this.addSql(`drop table if exists "auth"."oauth_clients" cascade;`)

    this.addSql(`drop table if exists "auth"."oauth_access_tokens" cascade;`)

    this.addSql(`alter table "auth"."verifications"
                 alter column "value" type varchar(255) using ("value"::varchar(255));`)
  }
}
