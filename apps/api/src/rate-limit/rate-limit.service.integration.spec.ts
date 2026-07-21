import { randomUUID } from 'crypto'

import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { createClient } from 'redis'
import { beforeAll, describe, expect, test } from 'vitest'

import { RedisService } from '@src/common/redis.service'
import { RateLimitService } from '@src/rate-limit/rate-limit.service'

const DRAGONFLY_URL =
  process.env.DRAGONFLY_URL ?? process.env.TEST_DRAGONFLY_URL ?? 'redis://localhost:6379'

async function isDragonflyReachable(): Promise<boolean> {
  const client = createClient({ url: DRAGONFLY_URL, socket: { connectTimeout: 500 } })
  try {
    await client.connect()
    await client.ping()
    return true
  } catch {
    return false
  } finally {
    if (client.isOpen) await client.disconnect()
  }
}

const dragonflyReachable = await isDragonflyReachable()

describe.skipIf(!dragonflyReachable)('RateLimitService (integration)', () => {
  let service: RateLimitService
  let keyPrefix: string

  const rateLimitConfig = {
    anonymous: { capacity: 5, leakRatePerSec: 1 },
    authenticated: { capacity: 50, leakRatePerSec: 10 },
  }

  beforeAll(async () => {
    process.env.DRAGONFLY_URL = DRAGONFLY_URL
    keyPrefix = `test:${randomUUID()}`

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        RedisService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'rateLimit.anonymous') return rateLimitConfig.anonymous
              if (key === 'rateLimit.authenticated') return rateLimitConfig.authenticated
              return undefined
            },
          },
        },
      ],
    }).compile()

    service = module.get<RateLimitService>(RateLimitService)
    const redis = module.get<RedisService>(RedisService)
    await redis.onModuleInit()
  })

  // CL.THROTTLE's max_burst param yields a total usable capacity of max_burst + 1,
  // so capacity + 1 consumes must succeed before the bucket is actually full.
  test('rejects once burst capacity is exceeded, with a positive retryAfterMs', async () => {
    const key = `${keyPrefix}:burst`

    for (let i = 0; i <= rateLimitConfig.anonymous.capacity; i++) {
      const result = await service.consume(key, 1, 'anonymous')
      expect(result.allowed).toBe(true)
    }

    const overflow = await service.consume(key, 1, 'anonymous')
    expect(overflow.allowed).toBe(false)
    expect(overflow.retryAfterMs).toBeGreaterThan(0)
  })

  test('anonymous and authenticated tiers use independent buckets for the same identity', async () => {
    const key = `${keyPrefix}:tiers`

    for (let i = 0; i <= rateLimitConfig.anonymous.capacity; i++) {
      await service.consume(key, 1, 'anonymous')
    }
    const anonOverflow = await service.consume(key, 1, 'anonymous')
    expect(anonOverflow.allowed).toBe(false)

    const authResult = await service.consume(key, 1, 'authenticated')
    expect(authResult.allowed).toBe(true)
  })

  test('recovers after waiting out retryAfterMs', async () => {
    const key = `${keyPrefix}:recovery`

    for (let i = 0; i <= rateLimitConfig.anonymous.capacity; i++) {
      await service.consume(key, 1, 'anonymous')
    }
    const overflow = await service.consume(key, 1, 'anonymous')
    expect(overflow.allowed).toBe(false)

    await new Promise((resolve) => setTimeout(resolve, overflow.retryAfterMs))

    const recovered = await service.consume(key, 1, 'anonymous')
    expect(recovered.allowed).toBe(true)
  }, 15_000)
})
