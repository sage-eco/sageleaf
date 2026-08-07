import { fileURLToPath } from 'url'

import tailwindcss from '@tailwindcss/vite'
// https://nuxt.com/docs/api/configuration/nuxt-config
import { defineNuxtConfig } from 'nuxt/config'

export default defineNuxtConfig({
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
    pageTransition: { name: 'default', mode: 'default' },
  },

  typescript: {
    typeCheck: true,
  },

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss() as any],
    envDir: fileURLToPath(new URL('.', import.meta.url)),
    optimizeDeps: {
      entries: 'app/**/*.{ts,vue}',
      include: ['graphql'],
    },
  },

  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag === 'iconify-icon',
    },
  },

  runtimeConfig: {
    public: {
      msw: {
        baseURL: 'http://localhost:3000',
      },
      scribeleafEnabled: false,
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

  msw: {
    folderPath: '~/msw',
    includeLayer: true,
  },

  colorMode: {
    classSuffix: '',
  },

  compatibilityDate: '2026-02-12',
})
