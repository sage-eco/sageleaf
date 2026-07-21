import { MikroOrmModule } from '@mikro-orm/nestjs'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER } from '@nestjs/core'
import dotenv from 'dotenv-flow'
import { Request } from 'express'
import { nanoid } from 'nanoid'
import { ClsModule, ClsService } from 'nestjs-cls'

import { AppController } from '@src/app.controller'
import { AppService } from '@src/app.service'
import { AuthModule } from '@src/auth/auth.module'
import { ChangesModule } from '@src/changes/changes.module'
import { CommonModule } from '@src/common/common.module'
import { HttpExceptionFilter } from '@src/common/http-exception.filter'
import { parseLanguageHeader } from '@src/common/i18n'
import config from '@src/config/config'
import { FeedModule } from '@src/feed/feed.module'
import { FeedbackModule } from '@src/feedback/feedback.module'
import { GeoModule } from '@src/geo/geo.module'
import { GraphQLModule } from '@src/graphql/graphql.module'
import { HealthModule } from '@src/health/health.module'
import { ProcessModule } from '@src/process/process.module'
import { ProductModule } from '@src/product/product.module'
import { SearchModule } from '@src/search/search.module'
import { UsersModule } from '@src/users/users.module'

import { MIKRO_TEST_CONFIG } from '../src/mikro-orm-test.config'

if (dotenv) {
  dotenv.config()
}

@Module({
  controllers: [AppController],
  exports: [],
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: true,
      // Disable rate limiting in tests
      load: [config, () => ({ rateLimit: { enabled: false } })],
    }),
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: (cls: ClsService, req: Request) => {
          if (req.headers['accept-language']) {
            cls.set('lang', parseLanguageHeader(req.headers['accept-language']))
          }
          if (req.headers['x-env']) {
            cls.set('x-env', req.headers['x-env'])
          }
          if (req.headers['x-location']) {
            cls.set('x-location', req.headers['x-location'])
          }
        },
        generateId: true,
        idGenerator: (req: Request) => {
          const existingId = req.headers['x-request-id']
          if (Array.isArray(existingId) || !existingId) {
            return nanoid()
          }
          return existingId
        },
      },
    }),
    CommonModule,
    MikroOrmModule.forRoot(MIKRO_TEST_CONFIG),
    GraphQLModule.register(),
    HealthModule,
    AuthModule,
    UsersModule,
    GeoModule,
    ProductModule,
    ProcessModule,
    ChangesModule,
    SearchModule,
    FeedModule,
    FeedbackModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }, AppService],
})
export class AppTestModule {}
