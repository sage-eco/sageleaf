import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

import { PosthogService } from '@src/common/posthog.service'

export const ENTITY_VIEW_TYPE_KEY = 'ENTITY_VIEW_TYPE'

@Injectable()
export class EntityViewInterceptor implements NestInterceptor {
  constructor(
    private readonly posthog: PosthogService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const entityType = this.reflector.get<string>(ENTITY_VIEW_TYPE_KEY, context.getHandler())
    if (!entityType) return next.handle()

    return next.handle().pipe(
      tap((result) => {
        const id: string | undefined = (result as any)?.id
        if (!result || !id) return
        this.posthog.captureEntityView(entityType, id)
      }),
    )
  }
}
