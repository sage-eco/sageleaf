import { Module } from '@nestjs/common'

import { RateLimitService } from '@src/rate-limit/rate-limit.service'

@Module({
  providers: [RateLimitService],
  exports: [RateLimitService],
})
export class RateLimitModule {}
