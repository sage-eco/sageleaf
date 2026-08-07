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
import { NodeModule } from '@src/graphql/node.module'
import { HealthModule } from '@src/health/health.module'
import { McpModule } from '@src/mcp/mcp.module'
import { MIKRO_CONFIG } from '@src/mikro-orm.config'
import { ProcessModule } from '@src/process/process.module'
import { ProductModule } from '@src/product/product.module'
import { SearchModule } from '@src/search/search.module'
import { UsersModule } from '@src/users/users.module'
import { WindmillModule } from '@src/windmill/windmill.module'

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
      load: [config],
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
    MikroOrmModule.forRoot(MIKRO_CONFIG),
    AuthModule,
    GraphQLModule.register(),
    NodeModule,
    HealthModule,
    UsersModule,
    GeoModule,
    ProductModule,
    ProcessModule,
    ChangesModule,
    SearchModule,
    FeedModule,
    FeedbackModule,
    WindmillModule,
    McpModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: HttpExceptionFilter }, AppService],
})
export class AppModule {}
