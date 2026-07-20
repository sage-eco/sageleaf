export const useGqlLoadingState = () => {
  const count = useState('gql-loading-count', () => 0)
  return {
    isLoading: computed(() => count.value > 0),
    increment: () => count.value++,
    decrement: () => {
      if (count.value > 0) count.value--
    },
  }
}
