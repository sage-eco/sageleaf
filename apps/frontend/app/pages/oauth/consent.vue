<template>
  <div class="flex grow items-center justify-center p-6 lg:p-10">
    <div class="grid w-full max-w-sm grid-cols-1 gap-8">
      <div>
        <p class="text-md">
          <strong>{{ clientName }}</strong> is requesting access to your Sage account.
        </p>
        <p class="text-md mt-4">Requested permissions:</p>
        <ul class="mt-2 list-inside list-disc">
          <li v-for="scope in scopes" :key="scope">{{ scope }}</li>
        </ul>
      </div>
      <Alert v-if="formError" variant="error">
        <AlertDescription>{{ formError }}</AlertDescription>
      </Alert>
      <div class="flex gap-4">
        <button class="btn btn-block" :disabled="submitting" @click="respond(false)">Deny</button>
        <button class="btn btn-block btn-primary" :disabled="submitting" @click="respond(true)">
          Allow
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
useTopbar({ title: 'Authorize Application', back: 'false' })

const auth = useAuthClient()
const route = useRoute()
const router = useRouter()

const clientId = route.query.client_id as string | undefined
const scopes = computed(() =>
  ((route.query.scope as string | undefined) ?? '').split(' ').filter(Boolean),
)
const clientName = ref(clientId ?? 'An application')
const formError = ref<string | null>(null)
const submitting = ref(false)

const session = auth.useSession()
if (!session.value.data) {
  router.replace(`/profile/sign_in?redirectTo=${encodeURIComponent(route.fullPath)}`)
}

if (clientId) {
  const { data } = await auth.oauth2.publicClient({ query: { client_id: clientId } })
  if (typeof data?.name === 'string' && data.name) clientName.value = data.name
}

const respond = async (accept: boolean) => {
  submitting.value = true
  formError.value = null
  const { data, error } = await auth.oauth2.consent({
    accept,
    oauth_query: route.fullPath.split('?')[1] ?? '',
  })
  submitting.value = false
  if (error) {
    formError.value = error.message || 'An error occurred while responding to the request'
    return
  }
  if (data?.url) {
    window.location.href = data.url
  }
}
</script>
