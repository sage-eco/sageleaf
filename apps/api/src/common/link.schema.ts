import { z } from 'zod/v4'

import { HTTPS_OR_ICON } from '@src/common/z.schema'

export const LinkOpenGraphSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  siteName: z.string().optional(),
})
export type LinkOpenGraph = z.infer<typeof LinkOpenGraphSchema>

// Client-settable subset; feeds Create/UpdateSchema (exposed as JSON Schema via GraphQL)
export const ExternalLinkInputSchema = z.object({
  url: z.url(),
  icon: z.url(HTTPS_OR_ICON).optional(),
  locale: z.string().optional(), // BCP 47
  label: z.string().optional(),
})
export type ExternalLinkInputData = z.infer<typeof ExternalLinkInputSchema>

// Storage shape only — never used for Create/UpdateSchema or GraphQL types
export const ExternalLinkSchema = ExternalLinkInputSchema.extend({
  openGraph: LinkOpenGraphSchema.optional(),
  httpStatus: z.number().int().min(0).max(999).optional(),
  contentType: z.string().optional(),
  etag: z.string().optional(),
  lastModified: z.string().optional(),
  fetchedAt: z.iso.datetime().optional(),
  expiresAt: z.iso.datetime().optional(),
  fetchError: z.string().optional(),
})
export type ExternalLink = z.infer<typeof ExternalLinkSchema>
