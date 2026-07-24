import { Controller, Get, Header } from '@nestjs/common'

import { AuthService } from '@src/auth/auth.service'
import { AllowAnonymous } from '@src/auth/decorators'
import { getApiOrigin, getAuthIssuer } from '@src/auth/oauth.constants'
import { createResourceClient } from '@src/auth/resource-client'

@Controller('.well-known/oauth-protected-resource')
export class OAuthResourceController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  @AllowAnonymous()
  @Header('Cache-Control', 'public, max-age=3600')
  async getProtectedResourceMetadata() {
    const resourceClient = createResourceClient(this.authService.instance)
    const resource = getApiOrigin()

    return resourceClient.getProtectedResourceMetadata({
      resource,
      authorization_servers: [getAuthIssuer()],
    })
  }
}
