import { oauthProviderResourceClient } from '@better-auth/oauth-provider/resource-client'

/**
 * Minimal structural shape oauthProviderResourceClient needs from an auth
 * instance. Kept loose (rather than `ReturnType<typeof configureAuth>`) so it
 * matches whatever concrete auth instance AuthService hands back, mirroring
 * the `Auth = any` escape hatch already used in auth.module.ts.
 */
// biome-ignore lint/suspicious/noExplicitAny: baseURL/basePath types vary across better-auth versions/configs
type ResourceClientAuth = {
  options: { baseURL?: any; basePath?: any }
  $context: Promise<unknown>
}

export const createResourceClient = (auth: ResourceClientAuth) =>
  oauthProviderResourceClient(auth).getActions()
