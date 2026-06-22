<template>
  <TolgeeProvider>
    <template #fallback><div /></template>
    <!-- Status-bar background overlay. Hidden on full-screen pages (e.g. scanner)
         via useStatusBarOverlay(false). -->
    <div
      v-if="statusBarOverlay"
      class="pointer-events-none fixed top-0 right-0 left-0 z-[100] bg-base-200"
      style="height: env(safe-area-inset-top)"
      aria-hidden="true"
    />
    <div>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </div>
  </TolgeeProvider>
</template>
<script setup lang="ts">
import { isTauri } from '@tauri-apps/api/core'
import { TolgeeProvider } from '@tolgee/vue'
import { useDark } from '@vueuse/core'

useHead({
  title: 'Sage',
  meta: [{ name: 'description', content: 'Circular economy information.' }],
})

const isDark = useDark({
  selector: 'html',
  attribute: 'data-theme',
  valueDark: 'dark',
  valueLight: 'light',
})

// Push the app's actual color scheme to the Android status bar icon controller.
// The Kotlin side registers "AndroidStatusBar" via addJavascriptInterface so it
// is available synchronously from the first render.
type NativeStatusBar = { setLight(isLight: boolean): void }
const nativeStatusBar =
  import.meta.client && isTauri()
    ? (window as Window & { AndroidStatusBar?: NativeStatusBar }).AndroidStatusBar
    : undefined

watch(
  isDark,
  (dark) => {
    nativeStatusBar?.setLight(!dark)
  },
  { immediate: true },
)

const statusBarOverlay = useState<boolean>('statusBarOverlay', () => true)
</script>

<style>
/* ─── Shared active state ─────────────────────────────────────── */

.page-left-enter-active,
.page-left-leave-active,
.page-right-enter-active,
.page-right-leave-active {
  position: fixed;
  top: var(--topbar-h, 0px);
  left: 0;
  width: 100%;
  bottom: 0;
  transition:
    left 320ms cubic-bezier(0.25, 0.1, 0.25, 1),
    opacity 320ms cubic-bezier(0.25, 0.1, 0.25, 1);
  will-change: left, opacity;
}

/* ─── Forward navigation (page-left) ─────────────────────────── */

.page-left-enter-active {
  z-index: 10;
}
.page-left-enter-from {
  left: 100%;
  opacity: 0;
}
.page-left-enter-to {
  left: 0;
  opacity: 1;
}

.page-left-leave-active {
  z-index: 1;
}
.page-left-leave-from {
  left: 0;
  opacity: 1;
}
.page-left-leave-to {
  left: -30%;
  opacity: 0;
}

/* ─── Back navigation (page-right) ───────────────────────────── */

.page-right-enter-active {
  z-index: 1;
}
.page-right-enter-from {
  left: -30%;
  opacity: 0;
}
.page-right-enter-to {
  left: 0;
  opacity: 1;
}

.page-right-leave-active {
  z-index: 10;
}
.page-right-leave-from {
  left: 0;
  opacity: 1;
}
.page-right-leave-to {
  left: 100%;
  opacity: 0;
}

/* ─── Cross-tab fade ──────────────────────────────────────────── */

.page-fade-enter-active,
.page-fade-leave-active {
  position: fixed;
  top: var(--topbar-h, 0px);
  left: 0;
  right: 0;
  bottom: 0;
  transition: opacity 120ms cubic-bezier(0.25, 0.1, 0.25, 1);
  will-change: opacity;
}
.page-fade-enter-active {
  z-index: 10;
}
.page-fade-leave-active {
  z-index: 1;
}
.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
.page-fade-enter-to,
.page-fade-leave-from {
  opacity: 1;
}
</style>
