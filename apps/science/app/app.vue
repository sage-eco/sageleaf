<template>
  <TolgeeProvider>
    <template #fallback><div /></template>
    <div>
      <NuxtLayout>
        <NuxtPage />
      </NuxtLayout>
    </div>
  </TolgeeProvider>
</template>
<script setup lang="ts">
import { TolgeeProvider } from '@tolgee/vue'
import { useDark } from '@vueuse/core'
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community'

ModuleRegistry.registerModules([AllCommunityModule])

useHead({
  title: 'Sageleaf Science',
  meta: [{ name: 'description', content: 'Circular economy information.' }],
})
useDark({
  selector: 'html',
  attribute: 'data-theme',
  valueDark: 'dark',
  valueLight: 'light',
})
</script>
