export const isProd = () => process.env.NODE_ENV === 'production'

/**
 * True for local dev and for the dev cluster deployment, which sets `IS_DEV=true`
 * despite running with `NODE_ENV=production`.
 */
export const isDev = () => !isProd() || process.env.IS_DEV === 'true'

/**
 * The base deployed domain (e.g. 'dev.sageleaf.app' or 'sageleaf.app')
 */
export const getBaseDomain = () => process.env.BASE_DOMAIN ?? 'dev.sageleaf.app'

/**
 * CIDRs/IPs of proxies trusted to set `X-Forwarded-For`, used to resolve
 * the real client IP for rate limiting. Comma-separated in `TRUSTED_PROXIES`.
 */
export const getTrustedProxies = () =>
  process.env.TRUSTED_PROXIES?.split(',')
    .map((proxy) => proxy.trim())
    .filter(Boolean) ?? []
