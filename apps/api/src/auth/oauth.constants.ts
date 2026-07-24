import { isProd } from '@src/common/common.utils'

export const getApiOrigin = () =>
  isProd() ? 'https://api.sageleaf.app' : 'https://api.dev.sageleaf.app'

export const getAuthIssuer = () => `${getApiOrigin()}/auth`
