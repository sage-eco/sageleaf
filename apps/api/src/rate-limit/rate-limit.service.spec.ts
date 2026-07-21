import { ConfigService } from '@nestjs/config'
import { Test, TestingModule } from '@nestjs/testing'
import { beforeEach, describe, expect, test, vi } from 'vitest'

import { RedisService } from '@src/common/redis.service'
import { RateLimitService } from '@src/rate-limit/rate-limit.service'

describe('RateLimitService', () => {
  let service: RateLimitService
  let redis: { throttle: ReturnType<typeof vi.fn> }

  const rateLimitConfig = {
    anonymous: { capacity: 300, leakRatePerSec: 5 },
    authenticated: { capacity: 3000, leakRatePerSec: 50 },
  }

  beforeEach(async () => {
    redis = { throttle: vi.fn() }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitService,
        { provide: RedisService, useValue: redis },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((key: string) => {
              if (key === 'rateLimit.anonymous') return rateLimitConfig.anonymous
              if (key === 'rateLimit.authenticated') return rateLimitConfig.authenticated
              return undefined
            }),
          },
        },
      ],
    }).compile()

    service = module.get<RateLimitService>(RateLimitService)
  })

  test('constructs the throttle key from a shortened tier label and identity', async () => {
    redis.throttle.mockResolvedValue([0, 300, 299, -1, 60])

    await service.consume('ip:1.2.3.4', 1, 'anonymous')

    expect(redis.throttle).toHaveBeenCalledWith('rl:anon:ip:1.2.3.4', 300, 300, 60, 1)
  })

  test('derives period from capacity / leakRatePerSec per tier', async () => {
    redis.throttle.mockResolvedValue([0, 3000, 2999, -1, 60])

    await service.consume('user:42', 1, 'authenticated')

    expect(redis.throttle).toHaveBeenCalledWith('rl:sess:user:42', 3000, 3000, 60, 1)
  })

  test('passes query complexity through as the throttle quantity', async () => {
    redis.throttle.mockResolvedValue([0, 300, 250, -1, 60])

    await service.consume('ip:1.2.3.4', 50, 'anonymous')

    expect(redis.throttle).toHaveBeenCalledWith('rl:anon:ip:1.2.3.4', 300, 300, 60, 50)
  })

  test('floors cost at 1 so zero-complexity queries still consume from the bucket', async () => {
    redis.throttle.mockResolvedValue([0, 300, 299, -1, 60])

    await service.consume('ip:1.2.3.4', 0, 'anonymous')

    expect(redis.throttle).toHaveBeenCalledWith('rl:anon:ip:1.2.3.4', 300, 300, 60, 1)
  })

  test('allows the request when under capacity', async () => {
    redis.throttle.mockResolvedValue([0, 300, 299, -1, 60])

    const result = await service.consume('ip:1.2.3.4', 1, 'anonymous')

    expect(result).toEqual({ allowed: true, retryAfterMs: 0 })
  })

  test('rejects the request with retryAfterMs when over capacity', async () => {
    redis.throttle.mockResolvedValue([1, 300, 0, 12, 60])

    const result = await service.consume('ip:1.2.3.4', 1, 'anonymous')

    expect(result).toEqual({ allowed: false, retryAfterMs: 12000 })
  })

  test('fails open when Redis/Dragonfly is unreachable', async () => {
    redis.throttle.mockResolvedValue(null)

    const result = await service.consume('ip:1.2.3.4', 1, 'anonymous')

    expect(result).toEqual({ allowed: true, retryAfterMs: 0 })
  })
})
