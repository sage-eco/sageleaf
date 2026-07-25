import { isProd } from '@src/common/common.utils'

const DEFAULT_ORIGIN = isProd() ? 'https://api.sageleaf.app' : 'https://api.dev.sageleaf.app'

/**
 * The origin better-auth itself uses to build issuer/audience claims (derived from
 * `BETTER_AUTH_URL`, or inferred from the request host if unset).
 */
export const getApiOrigin = () => (process.env.BETTER_AUTH_URL ?? DEFAULT_ORIGIN).replace(/\/$/, '')

export const getAuthIssuer = () => `${getApiOrigin()}/auth`
