import { join } from 'path'

import { Migrator } from '@mikro-orm/migrations'
import { DataloaderType, defineConfig, GeneratedCacheAdapter } from '@mikro-orm/postgresql'
import { TsMorphMetadataProvider } from '@mikro-orm/reflection'
import { SeedManager } from '@mikro-orm/seeder'
import { SqlHighlighter } from '@mikro-orm/sql-highlighter'
import dotenv from 'dotenv-flow'

import { CustomMigrationGenerator } from '@src/db/migration.gen'

if (dotenv) {
  dotenv.config()
}

const highlighter = new SqlHighlighter()
let url = process.env.DATABASE_URL
if (process.env.NODE_ENV === 'test') {
  // Use a test database URL if in test environment
  // We require a different env var to prevent accidentially overwriting the main database
  url = process.env.TEST_DATABASE_URL || 'cockroachdb://localhost:26257/sage_test'
}
let ssl: any = true
if (url?.includes('sslmode=disable')) {
  ssl = false
} else if (url?.includes('sslmode=no-verify')) {
  ssl = { rejectUnauthorized: false }
}
let metadataCache: any = undefined
if (process.env.NODE_ENV === 'production') {
  metadataCache = {
    enabled: true,
    adapter: GeneratedCacheAdapter,
    options: {
      data: require('../temp/metadata.json'),
    },
  }
}

export const MIKRO_CONFIG = defineConfig({
  entities: [join(process.cwd(), 'dist/**/*.entity.js')],
  entitiesTs: [join(process.cwd(), 'src/**/*.entity.ts')],
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
    pathTs: 'src/db/seeds/',
    defaultSeeder: 'DatabaseSeeder',
    glob: '!(*.d).{ts,js}',
    emit: 'ts',
  },
  serialization: {
    forceObject: true,
  },
  pool: {
    min: 5,
    max: 20,
    idleTimeoutMillis: 60000,
  },
  metadataProvider: TsMorphMetadataProvider,
  metadataCache,
  highlighter: process.env.NODE_ENV !== 'production' ? highlighter : undefined,
  extensions: [Migrator, SeedManager],
  dataloader: DataloaderType.ALL,
  allowGlobalContext: process.env.NODE_ENV === 'test',
  // Filters sharing a name across entities (e.g. rankOrderCursor) would otherwise
  // get auto-applied through M:1/1:1 relations, forcing unwanted joins.
  autoJoinRefsForFilters: false,
})
export default MIKRO_CONFIG
