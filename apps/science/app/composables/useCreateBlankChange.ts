import { graphql } from '~/gql'

export const useCreateBlankChange = () => {
  const changeStore = useChangeStore()
  const mutation = graphql(`
    mutation CreateBlankChange($input: CreateChangeInput!) {
      createChange(input: $input) {
        change {
          id
        }
      }
    }
  `)
  const { mutate } = useMutation(mutation)
  const createAndSwitch = async () => {
    const result = await mutate({ input: {} })
    const id = result?.data?.createChange?.change?.id
    if (id) changeStore.setChange(id)
    return id
  }
  return { createAndSwitch }
}
