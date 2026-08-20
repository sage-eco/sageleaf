import { z } from 'zod/v4'

export const PhoneNumberSchema = z.e164()

export const PhoneEntrySchema = z.object({
  purpose: z.string().max(64).optional(),
  phoneNumber: PhoneNumberSchema,
})
export type PhoneEntry = z.infer<typeof PhoneEntrySchema>
