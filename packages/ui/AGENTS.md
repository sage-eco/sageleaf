# UI Package (`packages/ui/`) — Agent Rules

**Package Name:** `@sageleaf/ui`

## Overview

Shared Vue component library used by both `apps/frontend` and `apps/science`. Built as a Nuxt-based component library.

## Usage

Import components using the package name from consuming apps:

```typescript
import { Component } from '@sageleaf/ui'
```

Components are also auto-imported in consuming apps (configured in their `nuxt.config.ts`) — no manual import needed in most cases.

## Development Guidelines

- Components follow the same Vue 3 Composition API patterns as the frontend and science apps
- Use `<script setup lang="ts">` for all components
- Style with Tailwind/DaisyUI classes; avoid app-specific styles
- Components should be generic and reusable across both frontend and science apps
- Avoid importing from `apps/` — this package must not depend on consuming apps

## Translations

UI components must **never** call `t()` on string props. The namespace must travel with the key, and the UI package has no knowledge of which namespace a consuming app uses.

**Wrong:**

```vue
<!-- List.vue -->
<p>{{ t(item.title) }}</p>
<!-- ❌ translating a prop inside a shared component -->
```

**Right:** render the prop directly; the caller is responsible for passing translated text:

```vue
<!-- List.vue -->
<p>{{ item.title }}</p>
<!-- ✓ render as-is -->

<!-- Caller -->
<UiList :items="[{ title: t.value('some.key', { ns: 'frontend' }) }]" />
```

See `apps/frontend/AGENTS.md` for the full translation patterns (`<T />` vs `t()` with inline `{ ns }`).

**English (`en.json`) is the source of truth and may be edited directly** — update the matching key in the same diff. Other language files are managed by Tolgee; translators fill them in via the dashboard, so don't hand-edit them. Run `nx i18n ui` to push English keys upstream and pull translated values back.

```bash
nx build ui                       # Build the component library
nx lint ui                        # Lint with oxlint
nx fmt ui                         # Format with oxfmt
```

## After Changes

After modifying UI components, consuming apps may need to rebuild:

```bash
nx build frontend
nx build science
```
