import { Field, ID, InterfaceType } from '@nestjs/graphql'

@InterfaceType({ resolveType: (value) => value._type })
export abstract class Node {
  @Field(() => ID)
  id!: string
}
