import { Controller, Get, Header } from '@nestjs/common'

import { AuthService } from '@src/auth/auth.service'
import { AllowAnonymous } from '@src/auth/decorators'

@Controller('.well-known/oauth-authorization-server/auth')
export class OAuthServerMetadataController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @AllowAnonymous()
  @Header('Cache-Control', 'public, max-age=3600')
  async getAuthServerMetadata() {
    return this.authService.api.getOAuthServerConfig({})
  }
}
