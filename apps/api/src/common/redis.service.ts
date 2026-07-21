import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { createClient, RedisClientType } from 'redis'

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name)
  private client: RedisClientType

  constructor() {
    this.client = createClient({
      url: process.env.DRAGONFLY_URL ?? 'redis://localhost:6379',
    }) as RedisClientType
  }

  async onModuleInit() {
    try {
      await this.client.connect()
    } catch (err) {
      this.logger.warn(`Failed to connect to Redis/DragonflyDB: ${err}`)
    }
  }

  async onModuleDestroy() {
    if (this.client.isOpen) {
      await this.client.disconnect()
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!this.client.isReady) return null
      return await this.client.get(key)
    } catch {
      return null
    }
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    try {
      if (!this.client.isReady) return
      await this.client.set(key, value, { EX: ttlSeconds })
    } catch {
      // ignore
    }
  }

  async throttle(
    key: string,
    maxBurst: number,
    count: number,
    period: number,
    quantity: number,
  ): Promise<[number, number, number, number, number] | null> {
    try {
      if (!this.client.isReady) return null
      const result = await this.client.sendCommand([
        'CL.THROTTLE',
        key,
        String(maxBurst),
        String(count),
        String(period),
        String(quantity),
      ])
      return result as unknown as [number, number, number, number, number]
    } catch {
      return null
    }
  }
}
