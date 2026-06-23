import { applyDecorators, SetMetadata, UseInterceptors } from '@nestjs/common'

import { ENTITY_VIEW_TYPE_KEY, EntityViewInterceptor } from '@src/common/entity-view.interceptor'

export function TrackEntityView(entityType: string) {
  return applyDecorators(
    SetMetadata(ENTITY_VIEW_TYPE_KEY, entityType),
    UseInterceptors(EntityViewInterceptor),
  )
}
