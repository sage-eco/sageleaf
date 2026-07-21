import { NestFactory } from '@nestjs/core'
import { ExpressAdapter, NestExpressApplication } from '@nestjs/platform-express'
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs'
import helmet from 'helmet'

import { AppModule } from '@src/app.module'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, new ExpressAdapter(), {
    bodyParser: false,
    cors: {
      origin: [
        'https://sageleaf.app',
        'https://dev.sageleaf.app',
        'https://science.dev.sageleaf.app',
        'https://tauri.localhost',
        'http://tauri.localhost',
        'tauri://localhost',
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true,
    },
  })
  app.set('trust proxy', 1)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          frameSrc: ["'self'", 'sandbox.embed.apollographql.com'],
          imgSrc: ["'self'", 'data:', 'apollo-server-landing-page.cdn.apollographql.com'],
          manifestSrc: ["'self'", 'apollo-server-landing-page.cdn.apollographql.com'],
          scriptSrc: ["'self'", "https: 'unsafe-inline'"],
        },
      },
      crossOriginOpenerPolicy: {
        policy: 'same-origin',
      },
      crossOriginResourcePolicy: {
        policy: 'same-site',
      },
      crossOriginEmbedderPolicy: false,
    }),
  )
  app.enableShutdownHooks()
  app.use(graphqlUploadExpress({ maxFileSize: 10_000_000, maxFiles: 1 }))
  await app.listen(process.env.PORT || 4444)
  if (process.env.SCHEMA_GEN) {
    await app.close()
  }
}
bootstrap()
