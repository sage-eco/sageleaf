import { oauthProviderResourceClient } from '@better-auth/oauth-provider/resource-client'

import type { Auth } from '@src/auth/auth.module'

export const createResourceClient = (auth: Auth) => oauthProviderResourceClient(auth).getActions()
