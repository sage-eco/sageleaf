import { z } from 'zod/v4'

function normalizePhoneNumber(value: unknown): unknown {
  if (typeof value === 'number') {
    value = String(value)
  }
  if (typeof value !== 'string') {
    return value
  }
  let normalized = value.trim().replace(/^tel:/i, '')
  normalized = normalized.replace(/[\s\-.()]/g, '')
  if (normalized && !normalized.startsWith('+')) {
    normalized = `+${normalized}`
  }
  return normalized
}

export const PhoneNumberSchema = z.preprocess(normalizePhoneNumber, z.e164())

export const PhoneEntrySchema = z.object({
  purpose: z.string().max(64).optional(),
  phoneNumber: PhoneNumberSchema,
})
export type PhoneEntry = z.infer<typeof PhoneEntrySchema>
