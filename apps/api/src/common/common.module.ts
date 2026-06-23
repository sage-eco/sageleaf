import path from 'path'

import { Global, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DiscoveryModule } from '@nestjs/core'
import { ClsModule } from 'nestjs-cls'
import { AcceptLanguageResolver, HeaderResolver, I18nModule, QueryResolver } from 'nestjs-i18n'

import { BaseSchemaService } from '@src/common/base.schema'
import { isProd } from '@src/common/common.utils'
import { EntityViewInterceptor } from '@src/common/entity-view.interceptor'
import { I18nService } from '@src/common/i18n.service'
import { MetaService } from '@src/common/meta.service'
import { PosthogService } from '@src/common/posthog.service'
import { RedisService } from '@src/common/redis.service'
import { StorageService } from '@src/common/storage.service'
import { TransformService } from '@src/common/transform'
import { ZService } from '@src/common/z.service'

@Global()
@Module({
  imports: [
    ClsModule.forRoot({ global: true }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '../i18n/'),
        watch: !isProd(),
      },
      typesOutputPath: isProd() ? undefined : path.join(__dirname, '../i18n/i18n.generated.ts'),
      resolvers: [
        new QueryResolver(['lang', 'locale']),
        new HeaderResolver(['x-lang', 'x-locale']),
        AcceptLanguageResolver,
      ],
    }),
    DiscoveryModule,
  ],
  providers: [
    ConfigService,
    TransformService,
    MetaService,
    BaseSchemaService,
    ZService,
    I18nService,
    PosthogService,
    RedisService,
    StorageService,
    EntityViewInterceptor,
  ],
  exports: [
    TransformService,
    MetaService,
    BaseSchemaService,
    ZService,
    I18nService,
    PosthogService,
    RedisService,
    StorageService,
    EntityViewInterceptor,
  ],
})
export class CommonModule {}
