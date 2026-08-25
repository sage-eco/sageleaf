import { Injectable } from '@nestjs/common'
import jsonld from 'jsonld'
import { DateTime } from 'luxon'
import { z } from 'zod/v4'

import { Source, SourceType } from '@src/changes/source.entity'
import {
  CreateSourceInput,
  LinkSourceInput,
  Source as SourceModel,
  UnlinkSourceInput,
  UpdateSourceInput,
} from '@src/changes/source.model'
import { expandCdnUrl, shrinkCdnUrl } from '@src/common/cdn'
import { TransformInput, ZService } from '@src/common/z.service'
import { User } from '@src/users/users.model'

export const JSONLD_CONTEXT: jsonld.ContextDefinition = {
  '@vocab': 'http://schema.org/',
  kg: 'http://g.co/kg',
  wd: 'http://www.wikidata.org/entity/',
  wdt: 'http://www.wikidata.org/prop/direct/',
}

const JSONLD_IRI_PREFIXES = Object.values(JSONLD_CONTEXT) as string[]

export const SourceIDSchema = z.string().meta({
  id: 'Source',
  title: 'Source ID',
})

const ContentUrlSchema = z
  .string()
  .transform((v) => shrinkCdnUrl(v))
  .pipe(z.string().regex(/^(https:\/\/|cdn:\/\/)/))
  .optional()

export const CreateSourceInputSchema = z.object({
  type: z.enum(SourceType),
  text: z.string().optional(),
  contentURL: ContentUrlSchema,
  metadata: z.record(z.string(), z.json()).optional(),
})
export const CreateSourceInputJSONSchema = z.toJSONSchema(CreateSourceInputSchema)

export const UpdateSourceInputSchema = z.object({
  id: z.nanoid(),
  type: z.enum(SourceType).optional(),
  text: z.string().optional(),
  contentURL: ContentUrlSchema,
  metadata: z.record(z.string(), z.json()).optional(),
})
export const UpdateSourceInputJSONSchema = z.toJSONSchema(UpdateSourceInputSchema)

const JsonLdIdSchema = z
  .string()
  .refine((v) => JSONLD_IRI_PREFIXES.some((prefix) => v.startsWith(prefix)), {
    message: '@id must be a Google Knowledge Graph or Wikidata entity IRI',
  })

async function canCompactJsonLd(doc: Record<string, unknown>): Promise<boolean> {
  try {
    await jsonld.compact(doc as jsonld.JsonLdDocument, JSONLD_CONTEXT)
    return true
  } catch {
    return false
  }
}

export const LinkSourceInputSchema = z.object({
  id: z.nanoid(),
  jsonld: z
    .looseObject({ '@id': JsonLdIdSchema })
    .refine(canCompactJsonLd, { message: 'jsonld must be a valid JSON-LD document' }),
})

export const UnlinkSourceInputSchema = z.object({
  id: z.nanoid(),
  jsonld: z
    .looseObject({ '@id': JsonLdIdSchema })
    .refine(canCompactJsonLd, { message: 'jsonld must be a valid JSON-LD document' }),
})

@Injectable()
export class SourceSchemaService {
  CreateSchema = CreateSourceInputSchema
  UpdateSchema = UpdateSourceInputSchema

  constructor(private readonly zService: ZService) {
    const ModelTransform = z.transform((input: TransformInput) => {
      const entity = input.input as Source
      const model = new SourceModel()
      model.id = entity.id
      model.createdAt = DateTime.fromJSDate(entity.createdAt)
      model.updatedAt = DateTime.fromJSDate(entity.updatedAt)
      model.type = entity.type
      model.location = entity.location
      model.content = entity.content
      model.contentURL = expandCdnUrl(entity.contentURL)
      model.processedAt = entity.processedAt ? DateTime.fromJSDate(entity.processedAt) : undefined
      model.metadata = entity.metadata?.extra
      model.user = this.zService.idRefToModel(User, entity.user)!
      return model
    })
    this.zService.registerEntityTransform(Source, SourceModel, ModelTransform)
  }

  async parseCreateInput(input: CreateSourceInput): Promise<CreateSourceInput> {
    return this.zService.parse(this.CreateSchema, input)
  }

  async parseUpdateInput(input: UpdateSourceInput): Promise<UpdateSourceInput> {
    return this.zService.parse(this.UpdateSchema, input)
  }

  async parseLinkInput(input: LinkSourceInput): Promise<LinkSourceInput> {
    return this.zService.parse(LinkSourceInputSchema, input as any) as Promise<LinkSourceInput>
  }

  async parseUnlinkInput(input: UnlinkSourceInput): Promise<UnlinkSourceInput> {
    return this.zService.parse(UnlinkSourceInputSchema, input as any) as Promise<UnlinkSourceInput>
  }
}
