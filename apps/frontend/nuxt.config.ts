import { execSync } from 'child_process'
import { fileURLToPath } from 'url'

import tailwindcss from '@tailwindcss/vite'
// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'

import { version } from './package.json'

const getGitSha = () => {
  if (process.env.APP_SHA) return process.env.APP_SHA
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return ''
  }
}

const gitSha = getGitSha()
const buildDate = new Date().toISOString()

// Set by Tauri CLI when running on a real device over WiFi.
// For emulators, Tauri uses `adb reverse` so localhost works — don't override.
const tauriDevHost = process.env.TAURI_DEV_HOST
export default defineNuxtConfig({
  devtools: { enabled: !process.env.TAURI_DEV_HOST },

  extends: ['../../packages/ui'],

  modules: [
    '@nuxtjs/apollo',
    '@nuxtjs/color-mode',
    '@nuxt/icon',
    '@nuxt/eslint',
    '@nuxt/image',
    '@pinia/nuxt',
    'reka-ui/nuxt',
    '@posthog/nuxt',
  ],

  app: {
    head: {
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon-32x32.png' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
    pageTransition: { name: 'default', mode: 'default' },
  },

  typescript: {
    typeCheck: true,
  },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss() as any],
    clearScreen: false,
    envDir: fileURLToPath(new URL('.', import.meta.url)),
    envPrefix: ['VITE_', 'TAURI_'],
    css: {
      devSourcemap: true,
    },
    server: {
      strictPort: true,
      hmr: tauriDevHost ? { protocol: 'ws', host: tauriDevHost, port: 5173 } : undefined,
    },
    optimizeDeps: {
      entries: 'app/**/*.{ts,vue}',
      include: [
        'graphql',
        'graphql-tag',
        '@tauri-apps/api/core',
        '@tauri-apps/plugin-sql',
        '@tauri-apps/plugin-geolocation',
        '@tauri-apps/plugin-os',
        '@tauri-apps/plugin-barcode-scanner',
        'maplibre-gl',
        'pmtiles',
        '@tolgee/format-icu',
        '@tolgee/vue',
        '@vueuse/core',
        'dexie',
        '@lucide/vue',
        'class-variance-authority',
        'clsx',
        'tailwind-merge',
        'embla-carousel-vue',
        'vaul-vue',
        'better-auth/vue',
        'ajv/dist/2020',
        'lodash-es',
        '@tanstack/vue-form',
        'zod',
        '@ericblade/quagga2',
      ],
      noDiscovery: process.env.NODE_ENV === 'test' ? true : false,
    },
  },

  devServer: {
    host: '0',
  },

  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag === 'iconify-icon',
    },
  },

  ssr: false,

  apollo: {
    clients: {
      default: {
        // @ts-expect-error
        httpEndpoint: () => useRuntimeConfig().public.apiurl + '/graphql',
        httpLinkOptions: {
          credentials: 'include',
        },
      },
    },
  },

  runtimeConfig: {
    public: {
      baseurl: 'https://dev.sageleaf.app',
      apiurl: 'https://api.dev.sageleaf.app',
      appVersion: version,
      buildDate,
      gitSha,
    },
  },

  icon: {
    mode: 'css',
    cssLayer: 'base',
    provider: 'server',
    localApiEndpoint: '/api/icons',
    fallbackToApi: true,
    serverBundle: {
      collections: ['material-symbols-light'],
    },
    clientBundle: {
      // Bundle all icons found in source files into the client JS so they
      // resolve without a server request (required for Tauri/static builds).
      scan: true,
    },
    customCollections: [
      {
        prefix: 'sageleaf-app',
        dir: './app/assets/icons',
      },
    ],
  },

  colorMode: {
    classSuffix: '',
  },

  sourcemap: {
    client: 'hidden',
  },

  nitro: {
    externals: {
      inline: ['@vue/shared'],
    },
    rollupConfig: {
      output: {
        sourcemapExcludeSources: false,
      },
    },
  },

  posthogConfig: {
    publicKey: 'phc_zJRW2N7cF9qAxfBaCCfXOpz42qQKr2WGOImojvinsUa',
    host: 'https://eu.i.posthog.com',
    clientConfig: {
      capture_exceptions: true, // Enables automatic exception capture on the client side (Vue)
    },
    serverConfig: {
      enableExceptionAutocapture: true, // Enables automatic exception capture on the server side (Nitro)
    },
    sourcemaps: {
      enabled: !!process.env.POSTHOG_PERSONAL_API_KEY,
      envId: '117506',
      personalApiKey: process.env.POSTHOG_PERSONAL_API_KEY || '',
      project: 'sage-frontend',
    },
  },

  ignore: ['**/src-tauri/**'],

  compatibilityDate: '2026-02-12',
})
