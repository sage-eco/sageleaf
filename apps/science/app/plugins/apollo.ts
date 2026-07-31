import type { ApolloClient } from '@apollo/client/core'
import { ApolloLink, Observable, from } from '@apollo/client/core'
import { setContext } from '@apollo/client/link/context'
import type { TolgeeInstance } from '@tolgee/vue'
import { provideApolloClient } from '@vue/apollo-composable'

export default defineNuxtPlugin(({ hook }) => {
  const { clients } = useApollo()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const defaultClient: ApolloClient<any> = (clients as any).default

  const regionStore = useRegionStore()

  const ctxLink = setContext((_, { headers }) => {
    const { $tolgee } = useNuxtApp()
    const locale = ($tolgee as TolgeeInstance | undefined)?.getLanguage() ?? ''
    let lang = (navigator && navigator.language) || ''
    if (locale) {
      lang = locale + ',' + lang
    }
    const xLocation = regionStore.selectedRegionId
    return {
      headers: {
        ...headers,
        'Accept-Language': lang,
        ...(xLocation ? { 'X-Location': xLocation } : {}),
      },
    }
  })

  const { increment, decrement } = useGqlLoadingState()

  const loadingLink = new ApolloLink((operation, forward) => {
    increment()
    return new Observable((observer) => {
      let settled = false
      const settle = () => {
        if (!settled) {
          settled = true
          decrement()
        }
      }
      const sub = forward(operation).subscribe({
        next: (result) => observer.next(result),
        error: (err) => {
          settle()
          observer.error(err)
        },
        complete: () => {
          settle()
          observer.complete()
        },
      })
      return () => {
        settle()
        sub.unsubscribe()
      }
    })
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultClient.setLink(from([loadingLink, ctxLink as any, defaultClient.link]))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  provideApolloClient(defaultClient as any)

  hook('apollo:error', (error) => {
    // oxlint-disable-next-line no-console
    console.log('error: ', error)
  })
})
