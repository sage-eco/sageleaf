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
    'pinia-plugin-persistedstate/nuxt',
    'reka-ui/nuxt',
  ],

  app: {
    head: {
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
    server: {
      strictPort: true,
      hmr: tauriDevHost ? { protocol: 'ws', host: tauriDevHost, port: 5173 } : undefined,
    },
    optimizeDeps: {
      include: [
        'graphql',
        '@tauri-apps/api/core',
        '@tauri-apps/plugin-opener',
        '@tauri-apps/plugin-os',
      ],
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
      baseurl: 'https://science.dev.sageleaf.app',
      apiurl: 'https://api.dev.sageleaf.app',
      appVersion: version,
      buildDate,
      gitSha,
      scribeleafEnabled: true,
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
  },

  colorMode: {
    classSuffix: '',
  },

  nitro: {
    externals: {
      inline: ['@vue/shared'],
    },
  },

  ignore: ['**/src-tauri/**'],

  compatibilityDate: '2026-02-12',
})
