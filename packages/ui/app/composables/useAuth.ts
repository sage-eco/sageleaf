import { oauthProviderClient } from '@better-auth/oauth-provider/client'
import { adminClient } from 'better-auth/client/plugins'
import { createAuthClient } from 'better-auth/vue'

export const useAuthClient = () => {
  const config = useRuntimeConfig()
  return createAuthClient({
    baseURL: config.public.apiurl + '/auth',
    plugins: [oauthProviderClient(), adminClient()],
  })
}

export const useAuth = () => {
  const client = useAuthClient()
  const { data: sessionData, ...rest } = useAsyncData('authSession', () => {
    return client.getSession()
  })

  const isAuthenticated = computed(() => !!sessionData.value?.data?.user)
  const isAdmin = computed(() => {
    const role = sessionData.value?.data?.user?.role
    return Array.isArray(role) ? role.includes('admin') : role === 'admin'
  })

  return {
    client,
    sessionData,
    isAuthenticated,
    isAdmin,
    ...rest,
  }
}

/**
 * @deprecated Use useAuth() instead.
 */
export const useAuthSession = () => {
  const { sessionData } = useAuth()
  return sessionData
}
