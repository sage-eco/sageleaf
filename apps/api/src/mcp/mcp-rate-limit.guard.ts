import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Response } from 'express'

import { AuthUserService } from '@src/auth/authuser.service'
import { RateLimitService } from '@src/rate-limit/rate-limit.service'

@Injectable()
export class McpRateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimitService: RateLimitService,
    private readonly authUser: AuthUserService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const httpContext = context.switchToHttp()
    const request = httpContext.getRequest()

    // GET/DELETE are rejected with 405 by the controller itself; only throttle writes/reads via POST.
    if (request.method !== 'POST') return true

    if (this.configService.get('rateLimit.enabled') === false) return true

    const userID = this.authUser.userID()
    if (!userID) return true // AuthGuard (global) already rejects unauthenticated requests

    const { allowed, retryAfterMs } = await this.rateLimitService.consume(
      userID,
      1,
      'authenticated',
    )
    if (!allowed) {
      const response = httpContext.getResponse<Response>()
      response.setHeader('Retry-After', String(Math.ceil(retryAfterMs / 1000)))
      throw new HttpException('Rate limit exceeded', 429)
    }

    return true
  }
}
