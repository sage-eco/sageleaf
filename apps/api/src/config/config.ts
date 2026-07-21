export default (): Record<string, unknown> => ({
  app: {
    version: process.env.APP_VERSION ?? process.env.npm_package_version ?? '0.0.0',
    sha: process.env.APP_SHA ?? 'unknown',
  },
  auth: {
    jwt: {
      secret: process.env.JWT_SECRET,
    },
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  port: parseInt(process.env.PORT ?? '4444', 10),
  posthog: {
    apiKey: process.env.POSTHOG_API_KEY,
  },
  windmill: {
    baseUrl: process.env.WINDMILL_BASE_URL,
    token: process.env.WINDMILL_TOKEN,
    workspace: process.env.WINDMILL_WORKSPACE,
  },
  dragonfly: {
    url: process.env.DRAGONFLY_URL,
  },
  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false',
    anonymous: {
      capacity: parseInt(process.env.RATE_LIMIT_ANON_CAPACITY ?? '300', 10),
      leakRatePerSec: parseInt(process.env.RATE_LIMIT_ANON_LEAK_RATE ?? '5', 10),
    },
    authenticated: {
      capacity: parseInt(process.env.RATE_LIMIT_AUTH_CAPACITY ?? '3000', 10),
      leakRatePerSec: parseInt(process.env.RATE_LIMIT_AUTH_LEAK_RATE ?? '50', 10),
    },
  },
  typesense: {
    host: process.env.TYPESENSE_HOST,
    apiKey: process.env.TYPESENSE_API_KEY,
  },
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY,
  },
  spaces: {
    key: process.env.DO_SPACES_KEY,
    secret: process.env.DO_SPACES_SECRET,
  },
})
