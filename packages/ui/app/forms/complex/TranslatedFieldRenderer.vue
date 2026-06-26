<template>
  <fieldset v-if="control.visible" :class="styles.translatedField.root">
    <div :class="styles.translatedField.labelRow">
      <label
        :for="control.id + '-text'"
        :class="[
          styles.translatedField.label,
          control.required ? styles.translatedField.required : '',
        ]"
      >
        {{ control.label }}
        <span v-if="showAsterisk" :class="styles.translatedField.asterisk">*</span>
      </label>
    </div>
    <div :class="styles.translatedField.tabBar">
      <button
        v-if="hasUnknownEntry"
        type="button"
        :class="[isUnknownActive ? styles.translatedField.tabActive : styles.translatedField.tab]"
        :disabled="!control.enabled"
        @click="activeLang = 'xx'"
      >
        Unknown
      </button>
      <button
        v-for="code in preferredLanguages"
        :key="code"
        type="button"
        :class="[
          code === activeLang ? styles.translatedField.tabActive : styles.translatedField.tab,
        ]"
        :disabled="!control.enabled"
        @click="activeLang = code"
      >
        {{ getLabel(code) }}
      </button>
      <PopoverRoot v-if="extraEntries.length > 0" v-model:open="extrasOpen">
        <PopoverTrigger as-child>
          <button
            type="button"
            :class="[
              activeExtraLang ? styles.translatedField.tabActive : styles.translatedField.tab,
            ]"
            :disabled="!control.enabled"
          >
            <span>{{ activeExtraLang ? getLabel(activeExtraLang) : 'Other languages' }}</span>
            <ChevronDown :size="14" />
          </button>
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent
            side="bottom"
            align="start"
            :side-offset="4"
            class="z-50 max-h-64 w-56 overflow-y-auto rounded-lg border border-base-content/10 bg-base-100 p-1 shadow-lg"
          >
            <button
              v-for="entry in extraEntries"
              :key="entry.lang"
              type="button"
              :class="[
                styles.translatedField.dropdownItem,
                entry.lang === activeLang ? styles.translatedField.dropdownItemActive : '',
              ]"
              @click="selectExtraLang(entry.lang)"
            >
              <span :class="styles.translatedField.dropdownItemLabel">
                {{ getLabel(entry.lang) }}
              </span>
              <span :class="styles.translatedField.dropdownItemCode">{{ entry.lang }}</span>
            </button>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
      <PopoverRoot v-model:open="addOpen">
        <PopoverTrigger as-child>
          <button
            type="button"
            :class="styles.translatedField.addButton"
            :disabled="!control.enabled"
            aria-label="Add language"
          >
            <span :class="styles.translatedField.addButtonContent">
              <Plus :size="14" />
              <span>Add language</span>
            </span>
          </button>
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverContent
            side="bottom"
            align="start"
            :side-offset="4"
            class="z-50 w-80 rounded-lg border border-base-content/10 bg-base-100 p-2 shadow-lg"
          >
            <input
              v-model="search"
              type="text"
              :class="styles.translatedField.dropdownSearch"
              placeholder="Search languages..."
              @keydown.escape="addOpen = false"
              @keydown.enter.prevent="confirmFirst"
            />
            <div :class="styles.translatedField.dropdownList">
              <button
                v-for="entry in filteredLanguages"
                :key="entry.part1"
                type="button"
                :class="styles.translatedField.dropdownItem"
                @click="pickNewLanguage(entry.part1)"
              >
                <span :class="styles.translatedField.dropdownItemLabel">
                  {{ entry.referenceName }}
                  <span
                    v-if="entry.nativeName && entry.nativeName !== entry.referenceName"
                    class="opacity-60"
                  >
                    | {{ entry.nativeName }}
                  </span>
                </span>
                <span :class="styles.translatedField.dropdownItemCode">{{ entry.part1 }}</span>
              </button>
              <div v-if="filteredLanguages.length === 0" :class="styles.translatedField.empty">
                No languages found
              </div>
            </div>
          </PopoverContent>
        </PopoverPortal>
      </PopoverRoot>
    </div>
    <div :class="styles.translatedField.fieldRow">
      <FormTextArea
        v-if="textIsMultiline"
        :id="control.id + '-text'"
        :model-value="activeEntry?.text ?? ''"
        :disabled="!control.enabled || isUnknownActive"
        :placeholder="textPlaceholder"
        rows="4"
        @update:model-value="onTextUpdate"
      />
      <FormInput
        v-else
        :id="control.id + '-text'"
        :model-value="activeEntry?.text ?? ''"
        :disabled="!control.enabled || isUnknownActive"
        :placeholder="textPlaceholder"
        @update:model-value="onTextUpdate"
      />
    </div>
    <div :class="styles.translatedField.checkbox">
      <FormSwitch
        :id="control.id + '-auto'"
        :model-value="!!activeEntry?.auto"
        :disabled="!control.enabled || isUnknownActive"
        @update:model-value="onAutoChange"
      />
      <label :class="styles.translatedField.checkboxLabel" :for="control.id + '-auto'">
        Auto-generated
      </label>
    </div>
  </fieldset>
</template>

<script lang="ts">
import type { ControlElement, JsonFormsRendererRegistryEntry, JsonSchema } from '@jsonforms/core'
import { rankWith, and, uiTypeIs, schemaTypeIs, schemaMatches } from '@jsonforms/core'
import type { RendererProps } from '@jsonforms/vue'
import { rendererProps, useJsonFormsArrayControl, useJsonFormsControl } from '@jsonforms/vue'
import { ChevronDown, Plus } from '@lucide/vue'
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui'
import type { Ref } from 'vue'
import { computed, defineComponent, ref, watch } from 'vue'

import {
  useDisplayLanguages,
  type DisplayLanguagesApi,
} from '../../composables/useDisplayLanguages'
import {
  getLanguageByCode,
  supportedLanguages,
  type LanguageEntry,
} from '../../utils/iso639-helpers'
import { useVanillaArrayControl } from '../util'

interface TranslationEntry {
  lang: string
  text?: string
  auto?: boolean
}

const isTranslatedArray = (schema: JsonSchema): boolean => {
  if (schema.type !== 'array') return false
  const items = schema.items
  if (!items || Array.isArray(items)) return false
  const langProp = (items as JsonSchema).properties?.lang as JsonSchema | undefined
  return langProp?.['$ref'] === '#/$defs/lang'
}

function getLabel(code: string): string {
  const entry = getLanguageByCode(code)
  if (entry) return entry.referenceName
  return code.toUpperCase()
}

function filterLanguages(all: LanguageEntry[], search: string): LanguageEntry[] {
  const q = search.trim().toLowerCase()
  if (!q) return all
  return all.filter((entry) => {
    return (
      entry.referenceName.toLowerCase().includes(q) ||
      entry.part1.toLowerCase().includes(q) ||
      entry.nativeName.toLowerCase().includes(q) ||
      (entry.nativeNameVariant?.toLowerCase().includes(q) ?? false)
    )
  })
}

function isMultilineSchema(schema: JsonSchema | undefined): boolean {
  if (!schema) return false
  const items = schema.items
  if (!items || Array.isArray(items)) return false
  const textProp = (items as JsonSchema).properties?.text as
    | (JsonSchema & Record<string, unknown>)
    | undefined
  if (!textProp) return false
  return textProp['multiLine'] === true || textProp['format'] === 'multi-line'
}

function useAddLanguagePicker(
  entries: Ref<TranslationEntry[]>,
  displayLanguages: Ref<string[]>,
  search: Ref<string>,
) {
  const availableLanguages = computed<LanguageEntry[]>(() => {
    const existing = new Set(entries.value.map((e) => e.lang))
    for (const code of displayLanguages.value) {
      existing.add(code)
    }
    existing.add('xx')
    return supportedLanguages.filter((entry) => !existing.has(entry.part1))
  })

  const filteredLanguages = computed<LanguageEntry[]>(() => {
    return filterLanguages(availableLanguages.value, search.value)
  })

  return { availableLanguages, filteredLanguages }
}

function useExtraEntries(entries: Ref<TranslationEntry[]>, displayLanguages: Ref<string[]>) {
  const extraEntries = computed<TranslationEntry[]>(() => {
    const prefCodes = new Set(displayLanguages.value)
    return entries.value.filter((entry) => !prefCodes.has(entry.lang) && entry.lang !== 'xx')
  })

  return { extraEntries }
}

interface HandlersContext {
  control: Ref<{ path: string; enabled: boolean }>
  handleChange: (path: string, value: unknown) => void
  addItem: (path: string, value: unknown) => () => void
  entries: Ref<TranslationEntry[]>
  activeLang: Ref<string>
  addOpen: Ref<boolean>
  extrasOpen: Ref<boolean>
  search: Ref<string>
  filteredLanguages: Ref<LanguageEntry[]>
}

function useHandlers(ctx: HandlersContext) {
  function findIndexByLang(code: string) {
    return ctx.entries.value.findIndex((e) => e.lang === code)
  }

  function ensureEntries(langs: string[]) {
    if (!ctx.control.value.enabled) return
    const existing = new Set(ctx.entries.value.map((e) => e.lang))
    for (const lang of langs) {
      if (!existing.has(lang)) {
        ctx.addItem(ctx.control.value.path, { lang, text: '', auto: false })()
      }
    }
  }

  function onTextUpdate(value: string | number) {
    const code = ctx.activeLang.value
    const idx = findIndexByLang(code)
    if (idx < 0) {
      ctx.addItem(ctx.control.value.path, { lang: code, text: String(value), auto: false })()
      return
    }
    ctx.handleChange(`${ctx.control.value.path}.${idx}.text`, String(value))
  }

  function onAutoChange(checked: boolean | undefined) {
    const code = ctx.activeLang.value
    const idx = findIndexByLang(code)
    if (idx < 0) {
      ctx.addItem(ctx.control.value.path, { lang: code, text: '', auto: !!checked })()
      return
    }
    ctx.handleChange(`${ctx.control.value.path}.${idx}.auto`, !!checked)
  }

  function selectExtraLang(code: string) {
    ctx.activeLang.value = code
    ctx.extrasOpen.value = false
  }

  function pickNewLanguage(code: string) {
    const idx = findIndexByLang(code)
    if (idx < 0) {
      ctx.addItem(ctx.control.value.path, { lang: code, text: '', auto: false })()
    }
    ctx.activeLang.value = code
    ctx.addOpen.value = false
    ctx.search.value = ''
  }

  function confirmFirst() {
    const first = ctx.filteredLanguages.value[0]
    if (first) {
      pickNewLanguage(first.part1)
    }
  }

  return {
    onTextUpdate,
    onAutoChange,
    selectExtraLang,
    pickNewLanguage,
    confirmFirst,
    ensureEntries,
  }
}

const controlRenderer = defineComponent({
  name: 'TranslatedFieldRenderer',
  components: { ChevronDown, Plus, PopoverRoot, PopoverTrigger, PopoverPortal, PopoverContent },
  props: {
    ...rendererProps<ControlElement>(),
  },
  setup(props: RendererProps<ControlElement>) {
    const displayLanguagesApi: DisplayLanguagesApi = useDisplayLanguages()
    const activeLang = ref<string>(displayLanguagesApi.languages.value[0] ?? 'en')
    const search = ref<string>('')
    const addOpen = ref<boolean>(false)
    const extrasOpen = ref<boolean>(false)
    const { handleChange } = useJsonFormsControl(props)
    const { control, addItem, styles } = useVanillaArrayControl(useJsonFormsArrayControl(props))

    const entries = computed<TranslationEntry[]>(() => {
      return Array.isArray(control.value.data) ? (control.value.data as TranslationEntry[]) : []
    })

    const textIsMultiline = computed<boolean>(() =>
      isMultilineSchema(control.value.schema as JsonSchema),
    )

    const showAsterisk = computed<boolean>(
      () => !!control.value.required && !control.value.uischema.options?.hideRequiredAsterisk,
    )

    const { extraEntries } = useExtraEntries(entries, displayLanguagesApi.languages)

    const hasUnknownEntry = computed<boolean>(() => {
      return entries.value.some((entry) => entry.lang === 'xx')
    })

    const isUnknownActive = computed<boolean>(() => activeLang.value === 'xx')

    const preferredLanguages = computed<string[]>(() =>
      displayLanguagesApi.languages.value.filter((code) => code !== 'xx'),
    )

    const activeExtraLang = computed<string>(() => {
      return extraEntries.value.some((entry) => entry.lang === activeLang.value)
        ? activeLang.value
        : ''
    })

    const { filteredLanguages } = useAddLanguagePicker(
      entries,
      displayLanguagesApi.languages,
      search,
    )

    const activeEntry = computed<TranslationEntry | undefined>(() => {
      return entries.value.find((entry) => entry.lang === activeLang.value)
    })

    const textPlaceholder = computed<string>(() => {
      return activeLang.value ? `${getLabel(activeLang.value)} translation` : ''
    })

    const handlers = useHandlers({
      control: control as unknown as Ref<{ path: string; enabled: boolean }>,
      handleChange: handleChange as unknown as (path: string, value: unknown) => void,
      addItem: addItem as unknown as (path: string, value: unknown) => () => void,
      entries,
      activeLang,
      addOpen,
      extrasOpen,
      search,
      filteredLanguages,
    })

    watch(
      () => displayLanguagesApi.languages.value,
      (newLangs) => {
        handlers.ensureEntries(newLangs.filter((code) => code !== 'xx'))
        const isInPrefs = newLangs.includes(activeLang.value)
        const isInExtras = extraEntries.value.some((e) => e.lang === activeLang.value)
        const isUnknown = activeLang.value === 'xx'
        if (!isInPrefs && !isInExtras && !isUnknown) {
          activeLang.value = newLangs[0] ?? 'en'
        }
      },
      { immediate: true },
    )

    return {
      control,
      styles,
      displayLanguages: displayLanguagesApi.languages,
      preferredLanguages,
      hasUnknownEntry,
      isUnknownActive,
      activeLang,
      search,
      addOpen,
      extrasOpen,
      entries,
      textIsMultiline,
      showAsterisk,
      extraEntries,
      activeExtraLang,
      filteredLanguages,
      activeEntry,
      textPlaceholder,
      onTextUpdate: handlers.onTextUpdate,
      onAutoChange: handlers.onAutoChange,
      selectExtraLang: handlers.selectExtraLang,
      pickNewLanguage: handlers.pickNewLanguage,
      confirmFirst: handlers.confirmFirst,
      getLabel,
    }
  },
})

export default controlRenderer

export const entry: JsonFormsRendererRegistryEntry = {
  renderer: controlRenderer,
  tester: rankWith(
    4,
    and(uiTypeIs('Control'), schemaTypeIs('array'), schemaMatches(isTranslatedArray)),
  ),
}
</script>
