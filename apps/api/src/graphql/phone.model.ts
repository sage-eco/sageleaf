import { Field, InputType, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class PhoneEntry {
  @Field(() => String, { nullable: true })
  purpose?: string

  @Field(() => String)
  phoneNumber!: string
}

@InputType()
export class PhoneEntryInput {
  @Field(() => String, { nullable: true })
  purpose?: string

  @Field(() => String)
  phoneNumber!: string
}
