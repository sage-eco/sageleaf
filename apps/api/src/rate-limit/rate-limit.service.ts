import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { RedisService } from '@src/common/redis.service'

export type RateLimitTier = 'anonymous' | 'authenticated'

interface RateLimitResult {
  allowed: boolean
  retryAfterMs: number
}

const TIER_KEY_LABEL: Record<RateLimitTier, string> = {
  anonymous: 'anon',
  authenticated: 'sess',
}

@Injectable()
export class RateLimitService {
  constructor(
    private redis: RedisService,
    private config: ConfigService,
  ) {}

  async consume(key: string, cost: number, tier: RateLimitTier): Promise<RateLimitResult> {
    const { capacity, leakRatePerSec } = this.config.get(`rateLimit.${tier}`)
    const period = Math.max(1, Math.round(capacity / leakRatePerSec))

    const result = await this.redis.throttle(
      `rl:${TIER_KEY_LABEL[tier]}:${key}`,
      capacity,
      capacity,
      period,
      Math.max(1, cost),
    )

    if (result === null) return { allowed: true, retryAfterMs: 0 }
    const [limited, , , retryAfterSec] = result
    return { allowed: limited === 0, retryAfterMs: limited === 0 ? 0 : retryAfterSec * 1000 }
  }
}
