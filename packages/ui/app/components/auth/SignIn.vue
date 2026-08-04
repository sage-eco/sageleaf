<template>
  <form class="grid w-full max-w-sm grid-cols-1 gap-8" @submit.prevent.stop="form.handleSubmit">
    <div class="mt-4">
      <form.Field name="email">
        <template #default="{ field }">
          <FormLabel :for="field.name" class="text-md my-3">Email</FormLabel>
          <FormInput
            :id="field.name"
            :name="field.name"
            :model-value="field.state.value"
            type="email"
            class="mt-4"
            @blur="field.handleBlur"
            @update:model-value="(value) => field.handleChange(value as string)"
          />
          <Alert v-if="!field.state.meta.isValid" variant="error" class="mt-4">
            <AlertDescription>{{
              field.state.meta.errors.map((e) => e && e.message).join(', ')
            }}</AlertDescription>
          </Alert>
        </template>
      </form.Field>
    </div>
    <div class="">
      <form.Field name="password">
        <template #default="{ field }">
          <FormLabel :for="field.name" class="text-md my-3">Password</FormLabel>
          <FormInput
            :id="field.name"
            :name="field.name"
            :model-value="field.state.value"
            type="password"
            class="mt-4"
            @blur="field.handleBlur"
            @update:model-value="(value) => field.handleChange(value as string)"
          />
          <Alert v-if="!field.state.meta.isValid" variant="error" class="mt-4">
            <AlertDescription>{{
              field.state.meta.errors.map((e) => e && e.message).join(', ')
            }}</AlertDescription>
          </Alert>
        </template>
      </form.Field>
    </div>
    <div class="flex items-center justify-between">
      <div class="grid grid-cols-[1.125rem_1fr] gap-x-4 gap-y-1">
        <FormCheckbox id="remember" class="my-1 inline-flex" :default-value="true" />
        <FormLabel for="remember" class="text-md">Remember me</FormLabel>
      </div>
      <NuxtLink to="/profile/forgot_password" class="text-sm underline-offset-4 hover:underline"
        >Forgot password?</NuxtLink
      >
    </div>
    <div>
      <form.Subscribe>
        <template #default="{ canSubmit, isSubmitting }">
          <button type="submit" :disabled="!canSubmit" class="btn btn-block btn-primary">
            {{ isSubmitting ? '...' : 'Sign In' }}
          </button>
        </template>
      </form.Subscribe>
    </div>
    <Alert v-if="formError" variant="error" class="mt-4">
      <AlertDescription>{{ formError }}</AlertDescription>
    </Alert>
  </form>
</template>

<script setup lang="ts">
import { useForm } from '@tanstack/vue-form'
import { z } from 'zod'

const auth = useAuthClient()

const emits = defineEmits<{
  (e: 'signIn'): void
}>()

const session = auth.useSession()
if (session.value.data) {
  emits('signIn')
}
const formError = ref<string | null>(null)

const form = useForm({
  defaultValues: {
    email: '',
    password: '',
  },
  validators: {
    onBlur: z.object({
      email: z.string().email(),
      password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
    }),
  },
  onSubmit: async ({ value }) => {
    formError.value = null
    const { error } = await auth.signIn.email({
      email: value.email,
      password: value.password,
    })
    if (error) {
      formError.value = error.message || 'An error occurred during sign in'
    }
    const session = await auth.getSession()
    if (session.data) {
      emits('signIn')
    }
  },
})
</script>
