import { join } from 'path'

import { Migrator } from '@mikro-orm/migrations'
import { DataloaderType, defineConfig, GeneratedCacheAdapter } from '@mikro-orm/postgresql'
import { SeedManager } from '@mikro-orm/seeder'
import { SqlHighlighter } from '@mikro-orm/sql-highlighter'
import dotenv from 'dotenv-flow'

import { Account } from '@src/auth/account.entity'
import { ApiKey } from '@src/auth/apikey.entity'
import { Jwks } from '@src/auth/jwks.entity'
import { OauthAccessToken } from '@src/auth/oauth-access-token.entity'
import { OauthClient } from '@src/auth/oauth-client.entity'
import { OauthConsent } from '@src/auth/oauth-consent.entity'
import { OauthRefreshToken } from '@src/auth/oauth-refresh-token.entity'
import { Session } from '@src/auth/session.entity'
import { Verification } from '@src/auth/verification.entity'
import { Change, ChangeEdits, ChangesSources } from '@src/changes/change.entity'
import { ExternalSource, Source } from '@src/changes/source.entity'
import { CustomMigrationGenerator } from '@src/db/migration.gen'
import { HomeFeed } from '@src/feed/home-feed.entity'
import { Place, PlaceHistory, PlacesTag } from '@src/geo/place.entity'
import { Region, RegionHistory } from '@src/geo/region.entity'
import {
  Component,
  ComponentHistory,
  ComponentsMaterials,
  ComponentsSources,
  ComponentsTags,
} from '@src/process/component.entity'
import { Material, MaterialEdge, MaterialHistory, MaterialTree } from '@src/process/material.entity'
import { Process, ProcessHistory, ProcessSources } from '@src/process/process.entity'
import { Tag } from '@src/process/tag.entity'
import { Category, CategoryEdge, CategoryHistory, CategoryTree } from '@src/product/category.entity'
import { Item, ItemHistory, ItemsCategories, ItemsTags } from '@src/product/item.entity'
import {
  Variant,
  VariantHistory,
  VariantsComponents,
  VariantsItems,
  VariantsOrgs,
  VariantsSources,
  VariantsTags,
} from '@src/product/variant.entity'
import { Invitation, Org, OrgHistory } from '@src/users/org.entity'
import { User, UsersOrgs } from '@src/users/users.entity'

if (dotenv) {
  dotenv.config()
}

const url = process.env.TEST_DATABASE_URL || 'cockroachdb://localhost:26257/sage_test'
let ssl: any = true
if (url?.includes('sslmode=disable')) {
  ssl = false
} else if (url?.includes('sslmode=no-verify')) {
  ssl = { rejectUnauthorized: false }
}

export const MIKRO_TEST_CONFIG = defineConfig({
  entities: [join(process.cwd(), 'dist/**/*.entity.js')],
  // TODO(CAJ2): Auto-discovery does not seem to work with Vitest, so for now we manually import entities
  entitiesTs: [
    Account,
    ApiKey,
    Category,
    CategoryEdge,
    CategoryHistory,
    CategoryTree,
    Change,
    ChangeEdits,
    ChangesSources,
    Component,
    ComponentHistory,
    ComponentsMaterials,
    ComponentsSources,
    ComponentsTags,
    ExternalSource,
    HomeFeed,
    Invitation,
    Item,
    ItemHistory,
    ItemsCategories,
    ItemsTags,
    Jwks,
    Material,
    MaterialEdge,
    MaterialHistory,
    MaterialTree,
    OauthAccessToken,
    OauthClient,
    OauthConsent,
    OauthRefreshToken,
    Org,
    OrgHistory,
    Place,
    PlaceHistory,
    PlacesTag,
    Process,
    ProcessHistory,
    ProcessSources,
    Region,
    RegionHistory,
    Session,
    Source,
    Tag,
    User,
    UsersOrgs,
    Variant,
    VariantHistory,
    VariantsComponents,
    VariantsItems,
    VariantsOrgs,
    VariantsSources,
    VariantsTags,
    Verification,
  ],
  preferTs: true,
  strict: true,
  clientUrl: url,
  driverOptions: {
    client: 'cockroachdb',
    connection: {
      ssl,
    },
  },
  forceUtcTimezone: true,
  debug: !!process.env.DB_DEBUG,
  migrations: {
    path: join(process.cwd(), 'dist/db/migrations'),
    pathTs: join(process.cwd(), 'src/db/migrations'),
    transactional: true,
    allOrNothing: true,
    generator: CustomMigrationGenerator,
  },
  seeder: {
    path: 'dist/db/seeds/',
    pathTs: 'dist/db/seeds/',
    defaultSeeder: 'DatabaseSeeder',
    glob: '!(*.d).{ts,js}',
    emit: 'js',
  },
  serialization: {
    forceObject: true,
  },
  metadataCache: {
    enabled: true,
    adapter: GeneratedCacheAdapter,
    options: {
      data: require(join(process.cwd(), 'temp/metadata.json')),
    },
  },
  highlighter: new SqlHighlighter(),
  extensions: [Migrator, SeedManager],
  dataloader: DataloaderType.ALL,
  allowGlobalContext: true,
  // Filters sharing a name across entities (e.g. rankOrderCursor) would otherwise
  // get auto-applied through M:1/1:1 relations, forcing unwanted joins.
  autoJoinRefsForFilters: false,
})
