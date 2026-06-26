<template>
  <div>
    <Alert v-if="formErrors.length > 0" variant="error" class="mb-4">
      <Collapsible v-model:open="errorsOpen" class="w-full">
        <CollapsibleTrigger class="flex w-full items-center justify-between gap-2 text-left">
          <div class="flex items-center gap-2">
            <AlertCircle :size="16" />
            <AlertTitle>
              {{ formErrors.length }} validation {{ formErrors.length === 1 ? 'error' : 'errors' }}
            </AlertTitle>
          </div>
          <ChevronDown
            :size="16"
            :class="errorsOpen ? 'rotate-180 transition-transform' : 'transition-transform'"
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <AlertDescription>
            <ul class="mt-2 space-y-1 text-xs">
              <li v-for="(error, idx) in formErrors" :key="idx" class="font-mono">
                <span class="opacity-70">{{ formatPath(error.instancePath) }}</span>
                <span class="opacity-50"> — </span>
                <span>{{ error.message ?? 'invalid value' }}</span>
              </li>
            </ul>
          </AlertDescription>
        </CollapsibleContent>
      </Collapsible>
    </Alert>
    <JsonForms
      v-if="schema && uischema"
      :schema="schema"
      :uischema="uischema"
      :data="data"
      :ajv="ajv"
      :renderers="renderers"
      :readonly="readOnly"
      @change="onChange"
    />
  </div>
</template>

<script setup lang="ts">
import type { JsonSchema, UISchemaElement } from '@jsonforms/core'
import { JsonForms, type JsonFormsChangeEvent } from '@jsonforms/vue'
import { AlertCircle, ChevronDown } from '@lucide/vue'
import type { ErrorObject } from 'ajv'
import addFormats from 'ajv-formats'
import Ajv from 'ajv/dist/2020'
import { ref } from 'vue'

import { renderers } from '../../forms'

const ajv = new Ajv({
  allErrors: true,
  verbose: true,
  strictTypes: false,
  validateFormats: false,
  keywords: ['name'],
})
addFormats(ajv)

const { schema, uischema, data, readOnly } = defineProps<{
  schema: JsonSchema
  uischema: UISchemaElement
  data: object | null | undefined
  readOnly?: boolean
}>()

const emits = defineEmits<{
  (e: 'change', event: JsonFormsChangeEvent): void
}>()

const formErrors = ref<ErrorObject[]>([])
const errorsOpen = ref<boolean>(false)

const onChange = (event: JsonFormsChangeEvent) => {
  formErrors.value = (event.errors as ErrorObject[] | undefined) ?? []
  emits('change', event)
}

const formatPath = (path: string): string => {
  if (!path) return '(root)'
  return path.split('/').filter(Boolean).join(' → ')
}
</script>
