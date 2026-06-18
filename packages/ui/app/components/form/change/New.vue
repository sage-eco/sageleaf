<template>
  <div>
    <form class="grid w-full max-w-sm grid-cols-1 gap-8" @submit.prevent.stop="form.handleSubmit">
      <div class="mt-4">
        <form.Field name="title">
          <template #default="{ field }">
            <FormLabel :for="field.name" class="text-md my-3">Title</FormLabel>
            <FormInput
              :id="field.name"
              :name="field.name"
              :value="field.state.value"
              class="mt-4"
              :validators="{
                onBlur: z.string().min(2).max(100),
              }"
              @blur="field.handleBlur"
              @input="(e: any) => field.handleChange((e.target as HTMLInputElement).value)"
            />
            <Alert v-if="!field.state.meta.isValid" variant="error" class="mt-4">
              <AlertDescription>{{
                field.state.meta.errors.map((e) => e).join(', ')
              }}</AlertDescription>
            </Alert>
          </template>
        </form.Field>
      </div>
      <div class="">
        <form.Field name="description">
          <template #default="{ field }">
            <FormLabel :for="field.name" class="text-md my-3">Description</FormLabel>
            <FormInput
              :id="field.name"
              :name="field.name"
              :value="field.state.value"
              class="mt-4"
              :validators="{
                onBlur: z.string().min(2).max(2000),
              }"
              @blur="field.handleBlur"
              @input="(e: any) => field.handleChange((e.target as HTMLInputElement).value)"
            />
            <Alert v-if="!field.state.meta.isValid" variant="error" class="mt-4">
              <AlertDescription>{{
                field.state.meta.errors.map((e) => e).join(', ')
              }}</AlertDescription>
            </Alert>
          </template>
        </form.Field>
      </div>
      <div>
        <form.Subscribe>
          <template #default="{ canSubmit, isSubmitting }">
            <button type="submit" :disabled="!canSubmit" class="btn btn-block btn-primary">
              {{ isSubmitting ? '...' : 'Create Change' }}
            </button>
          </template>
        </form.Subscribe>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { useForm } from '@tanstack/vue-form'
import { z } from 'zod'

import { graphql } from '~/gql'

const emit = defineEmits<{ created: [id?: string] }>()

const createChangeMutation = graphql(`
  mutation CreateChangeFromForm($input: CreateChangeInput!) {
    createChange(input: $input) {
      change {
        id
      }
    }
  }
`)

const { mutate: createChange } = useMutation(createChangeMutation)

const form = useForm({
  defaultValues: {
    title: '',
    description: '',
  },
  validators: {},
  onSubmit: async ({ value }) => {
    const result = await createChange({
      input: { title: value.title, description: value.description },
    })
    emit('created', result?.data?.createChange?.change?.id ?? undefined)
  },
})
</script>
