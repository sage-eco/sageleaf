import { Injectable, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { ClsService } from 'nestjs-cls'
import { PostHog } from 'posthog-node'
import { uuidv7 } from 'uuidv7'

import type { UserSession } from '@src/auth/auth.guard'

@Injectable()
export class PosthogService implements OnModuleDestroy {
  private readonly client: PostHog | null

  constructor(
    private readonly cls: ClsService,
    private readonly config: ConfigService,
  ) {
    const apiKey = this.config.get<string | undefined>('posthog.apiKey')
    if (apiKey) {
      this.client = new PostHog(apiKey, { host: 'https://eu.i.posthog.com' })
      const version = this.config.get<string>('app.version')
      const sha = this.config.get<string>('app.sha')
      this.client.register({
        app: 'api',
        app_version: version ?? 'dev',
        app_sha: sha ?? '',
        environment: process.env.NODE_ENV ?? 'unknown',
      })
    } else {
      this.client = null
    }
  }

  capture(event: string, properties: Record<string, unknown>) {
    if (!this.client) return
    const session = this.cls.get<UserSession | null>('session')
    const distinctId = session?.user?.id ?? uuidv7()
    this.client.capture({ distinctId, event, properties })
  }

  captureEntityView(entityType: string, entityId: string) {
    const rawLocation = this.cls.get<string | undefined>('x-location')
    const isRegionId = rawLocation?.startsWith('wof_')
    this.capture('view_entity', {
      entity_type: entityType,
      entity_id: entityId,
      region_id: isRegionId ? rawLocation : undefined,
      coordinates: !isRegionId ? rawLocation : undefined,
    })
  }

  captureException(exception: unknown) {
    if (!this.client) return

    const err = exception instanceof Error ? exception : new Error(String(exception))
    const session = this.cls.get<UserSession | null>('session')
    const distinctId = session?.user?.id ?? uuidv7()
    this.client.captureException(err, distinctId)
  }

  async onModuleDestroy() {
    await this.client?.shutdown()
  }
}
