# Frontend App (`apps/frontend/`) — Agent Rules

**Package Name:** `@sageleaf/frontend`

## Overview

Nuxt 3-based multi-platform application (web, iOS, Android) for the Sage platform.

## Framework & Architecture

- **Framework:** Nuxt 4.x (Vue 3)
- **Mobile:** Tauri v2+ for iOS & Android (Rust-based native wrapper)
- **State Management:** Pinia
- **API Client:** Apollo Client (GraphQL)
- **UI Framework:** DaisyUI (Tailwind CSS v4+)
- **Internationalization:** @nuxtjs/i18n

## Entry Points & Configuration

- **App Root:** `app.vue`
- **Config:** `nuxt.config.ts`
- **Tauri:** `src-tauri/` — Rust-based native mobile wrapper configuration
- **GraphQL Codegen:** `codegen.ts`
- **Linting/Formatting:** `.oxlintrc.json`, `.oxfmtrc.json`, `eslint.config.mjs`
- **Environment:**
  - Development: `config/dev/.env`
  - Production: `config/production/.env`

## Project Structure

```
apps/frontend/
├── assets/         # Static assets (CSS, images)
├── components/     # Vue components
├── composables/    # Composition API composables
├── config/         # Environment configs
├── gql/            # GraphQL queries/mutations (generated types)
├── i18n/           # Translation files
├── layouts/        # Nuxt layouts
├── middleware/     # Route middleware
├── modules/        # Nuxt modules
├── pages/          # File-based routes
├── plugins/        # Nuxt plugins
├── public/         # Public static files
├── server/         # Server API routes
├── stores/         # Pinia stores
├── utils/          # Utility functions
└── src-tauri/      # Tauri native wrapper (Rust)
```

## Common Commands

```bash
# Development
nx dev frontend                   # Start dev server

# Build
nx build frontend                 # Build for production
nx generate frontend              # Generate static site (dev env)
nx generate:prod frontend         # Generate static (prod env)

# Preview
nx preview frontend               # Preview built app

# GraphQL Code Generation (runs automatically as part of build)
nx build frontend                 # Also regenerates GQL types from schema

# Mobile Development (Tauri)
nx android:dev frontend           # Start Android dev with hot reload
nx android:build frontend         # Build Android APK (aarch64 + armv7)
nx android:run frontend           # Run on connected Android device
nx ios:open frontend              # Open iOS dev environment
nx ios:build frontend             # Build iOS app (aarch64 + armv7)
nx ios:run frontend               # Run on connected iOS device

# Linting & Formatting
nx lint frontend                  # Lint with oxlint + ESLint, auto-fix
nx lint:ci frontend               # Lint for CI (no fixes, fail on warnings)
nx fmt frontend                   # Format code with oxfmt
nx fmt:ci frontend                # Check formatting for CI
```

## Key Dependencies

- **Core:** nuxt, vue, vue-router
- **UI:** daisyui, @nuxt/icon, @nuxt/image
- **Mobile:** @tauri-apps/cli, @tauri-apps/plugin-barcode-scanner
- **GraphQL:** @apollo/client, @nuxtjs/apollo, @graphql-codegen/cli
- **State:** @pinia/nuxt
- **i18n:** @nuxtjs/i18n
- **Utilities:** lodash, zod

## Vue/Nuxt Patterns

**Component Structure:**

```vue
<script setup lang="ts">
// Imports (if needed for non-auto-imported items)
// Composables and reactive state
// Functions and logic
</script>

<template>
  <!-- Template with Tailwind/DaisyUI classes -->
</template>

<style scoped>
/* Component-specific styles (only if needed, prefer Tailwind) */
</style>
```

**Composables:**

- Export functions from `composables/*.ts`
- Use `use` prefix: `useAuth`, `useProducts`
- Auto-imported — no need to import manually
- Return reactive state and functions

**GraphQL Usage:**

```typescript
import { graphql, useFragment, type FragmentType } from '~/gql'
const somethingQuery = graphql(`
  QUERY HERE
`)
```

## Routing

- File-based routing in `pages/`
- Use layouts in `layouts/` for page structure
- Middleware in `middleware/` for route guards

## State Management

- Create stores in `stores/` using Pinia
- Auto-imported by Nuxt
- Use composables for reusable logic

## Mobile Development (Tauri)

- Tauri provides Rust-based native wrappers for iOS and Android
- Build APKs with `android:build` or iOS apps with `ios:build`
- Use Tauri plugins for native features (barcode scanning, camera, etc.)
- Development uses hot reload with `android:dev` or `ios:open`
- Test on actual devices for best results

**Tauri build errors:**

- Check Rust toolchain: `rustc --version`
- Verify Android SDK is installed and configured
- Check `src-tauri/Cargo.toml` for dependencies
- Review `src-tauri/tauri.conf.json` for config
- Common issues: missing permissions in `tauri.conf.json`, incorrect capabilities, platform-specific code not properly gated

## Styling

- DaisyUI provides component classes
- Tailwind CSS for utility classes
- Color mode support via `@nuxtjs/color-mode`

## Internationalization

Translation files live in `i18n/{namespace}/{language}.json`.

**English (`en.json`) is the source of truth and may be edited directly.** When you add or change a user-facing string, update the matching key in `i18n/frontend/en.json` (or `i18n/common/en.json` for shared strings) in the same diff. Other language files (`sv.json`, etc.) are managed by Tolgee — translators fill them in via the Tolgee dashboard, so don't hand-edit non-English locale files.

To sync with Tolgee — push the English keys upstream and pull translated values back into the per-language files:

```bash
nx i18n frontend
```

The `tolgee` CLI in this project reads `en.json` and pushes those keys to Tolgee, then pulls translated values back into the per-language files. It also scans source patterns (`./app/**/*.{ts,vue}`) to verify keys are actually referenced, so `<T>` / `t.value()` calls in components are still required.

The namespace must always be co-located with the key — never set at the `useTranslate()` call site.

**In templates — always prefer `<T />`:**

```vue
<T ns="frontend" key-name="some.key" />
<T ns="common" key-name="other.key" />
```

`T` is a script-setup binding from `@tolgee/vue`, not a global auto-import — import it in `<script setup>` for the template to see it:

```ts
import { T, useTranslate } from '@tolgee/vue'
```

**In scripts — use `useTranslate()` with no namespace arg, pass `{ ns }` inline:**

```ts
const { t } = useTranslate()
const label = computed(() => t.value('some.key', { ns: 'frontend' }))
```

Never do `useTranslate('namespace')` — it hides the namespace from the Tolgee CLI extractor when multiple `useTranslate` calls exist in the same file.

**Template vs. script auto-unwrap:** `t` is a ref-like function that Vue auto-unwraps in templates but not in `<script setup>`. In a template expression use `t('key', { ns })`; in script use `t.value('key', { ns })`. Writing `t.value(...)` in a template is a `vue-tsc` error (`Property 'value' does not exist on type 'TFnType<...>'`).
