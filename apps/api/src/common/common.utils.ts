export const isProd = () => process.env.NODE_ENV === 'production'

/**
 * The base deployed domain (e.g. 'dev.sageleaf.app' or 'sageleaf.app')
 */
export const getBaseDomain = () => process.env.BASE_DOMAIN ?? 'dev.sageleaf.app'
