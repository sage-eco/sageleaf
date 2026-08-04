import { KeyvAdapter } from '@apollo/utils.keyvadapter'
import { ErrorsAreMissesCache, InMemoryLRUCache } from '@apollo/utils.keyvaluecache'
import KeyvRedis from '@keyv/redis'
import { ConfigService } from '@nestjs/config'
import { Keyv } from 'keyv'

import { OtelLogger } from '@src/common/otel-logger.service'

const logger = new OtelLogger('GraphQLCache')

export const createGraphQLCache = (configService: ConfigService) => {
  const url = configService.get<string>('dragonfly.url')
  if (!url) {
    logger.warn(
      'DRAGONFLY_URL not set — falling back to a per-process in-memory GraphQL response cache',
    )
    return new InMemoryLRUCache()
  }
  const keyv = new Keyv({ store: new KeyvRedis(url, { connectionTimeout: 1000 }) })
  return new ErrorsAreMissesCache(new KeyvAdapter(keyv))
}
