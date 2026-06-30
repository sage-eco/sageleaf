<template>
  <div class="mx-auto w-full max-w-3xl p-6">
    <h1 class="mb-2 text-2xl font-bold">Settings</h1>
    <p class="mb-8 text-sm text-base-content/70">Customize your preferences for this app.</p>

    <section class="mb-10">
      <h2 class="mb-1 text-lg font-semibold">Display Languages</h2>
      <p class="mb-4 text-sm text-base-content/70">
        Languages shown as quick-edit tabs in translation fields. English is always included first.
      </p>

      <div v-if="displayLanguages.length === 0" class="text-sm text-base-content/50">
        No languages selected
      </div>

      <ul v-else class="mb-4 flex flex-wrap gap-2">
        <li
          v-for="code in displayLanguages"
          :key="code"
          class="badge gap-2 badge-lg"
          :class="code === 'en' ? 'badge-primary' : 'badge-outline'"
        >
          <span class="font-mono text-xs uppercase opacity-70">{{ code }}</span>
          <span>{{ getLabel(code) }}</span>
          <button
            v-if="code !== 'en'"
            type="button"
            class="ml-1 cursor-pointer hover:text-error"
            :aria-label="`Remove ${code}`"
            @click="prefs.removeDisplayLanguage(code)"
          >
            <X :size="14" />
          </button>
          <span v-else class="opacity-50" aria-label="English is required">
            <Lock :size="12" />
          </span>
        </li>
      </ul>

      <PopoverRoot v-model:open="addOpen">
        <PopoverTrigger as-child>
          <Button variant="outline" size="sm">
            <Plus :size="16" />
            Add language
          </Button>
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent
            side="bottom"
            align="start"
            :side-offset="4"
            class="z-50 w-80 rounded-lg border border-base-content/10 bg-base-100 p-2 shadow-lg"
          >
            <FormInput
              v-model="search"
              placeholder="Search languages..."
              class="mb-2"
              @keydown.escape="addOpen = false"
              @keydown.enter.prevent="confirmFirst"
            />
            <div class="max-h-64 overflow-y-auto">
              <button
                v-for="entry in filteredLanguages"
                :key="entry.part1"
                type="button"
                class="flex w-full cursor-pointer items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-base-200"
                @click="addLanguage(entry.part1)"
              >
                <span>
                  {{ entry.referenceName }}
                  <span
                    v-if="entry.nativeName && entry.nativeName !== entry.referenceName"
                    class="opacity-60"
                  >
                    | {{ entry.nativeName }}
                  </span>
                </span>
                <span class="font-mono text-xs text-base-content/60">{{ entry.part1 }}</span>
              </button>
              <div
                v-if="filteredLanguages.length === 0"
                class="px-2 py-3 text-center text-sm text-base-content/50"
              >
                No languages found
              </div>
            </div>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
    </section>
  </div>
</template>

<script setup lang="ts">
import { Lock, Plus, X } from '@lucide/vue'
import { getLanguageByCode, supportedLanguages } from '@sageleaf/ui/app/utils/iso639-helpers'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import { computed, ref } from 'vue'

import { usePreferencesStore } from '~/stores/preferences_store'

const prefs = usePreferencesStore()

const addOpen = ref<boolean>(false)
const search = ref<string>('')

const displayLanguages = computed<string[]>(() => prefs.displayLanguages)

const filteredLanguages = computed(() => {
  const q = search.value.trim().toLowerCase()
  const selected = new Set(prefs.displayLanguages)
  const candidates = supportedLanguages.filter((entry) => !selected.has(entry.part1))
  if (!q) return candidates
  return candidates.filter((entry) => {
    return (
      entry.referenceName.toLowerCase().includes(q) ||
      entry.part1.toLowerCase().includes(q) ||
      entry.nativeName.toLowerCase().includes(q) ||
      (entry.nativeNameVariant?.toLowerCase().includes(q) ?? false)
    )
  })
})

function addLanguage(code: string) {
  prefs.addDisplayLanguage(code)
  addOpen.value = false
  search.value = ''
}

function confirmFirst() {
  const first = filteredLanguages.value[0]
  if (first) {
    addLanguage(first.part1)
  }
}

function getLabel(code: string): string {
  const entry = getLanguageByCode(code)
  if (entry) return entry.referenceName
  return code.toUpperCase()
}
</script>
