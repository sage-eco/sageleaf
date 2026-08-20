import { Injectable } from '@nestjs/common'
import { DateTime } from 'luxon'
import { z } from 'zod/v4'

import { Source as SourceEntity } from '@src/changes/source.entity'
import { expandCdnUrl } from '@src/common/cdn'
import { TransformInput, ZService } from '@src/common/z.service'
import { Image } from '@src/product/image.model'

@Injectable()
export class ImageSchemaService {
  constructor(private readonly zService: ZService) {
    const ImageTransform = z.transform((input: TransformInput) => {
      const entity = input.input as SourceEntity
      const model = new Image()
      model.id = entity.id
      model.createdAt = DateTime.fromJSDate(entity.createdAt)
      model.updatedAt = DateTime.fromJSDate(entity.updatedAt)
      model.url = expandCdnUrl(entity.location) ?? ''
      model.size = entity.metadata?.extra?.size as string | undefined
      return model
    })
    this.zService.registerEntityTransform(SourceEntity, Image, ImageTransform)
  }
}
