import { Injectable } from '@nestjs/common'
import { ValidateFunction } from 'ajv'
import { DateTime } from 'luxon'
import { z } from 'zod/v4'

import { ChangeInputWithLangSchema } from '@src/changes/change.schema'
import { BaseSchemaService, RelMetaSchema, zToSchema } from '@src/common/base.schema'
import { requireNameOrNameTr, TrArraySchema } from '@src/common/i18n'
import { I18nService } from '@src/common/i18n.service'
import { ExternalLinkInputSchema } from '@src/common/link.schema'
import { ISchemaService, IsSchemaService } from '@src/common/meta.service'
import { PhoneEntrySchema } from '@src/common/phone.schema'
import { UISchemaElement } from '@src/common/ui.schema'
import { TransformInput, ZService } from '@src/common/z.service'
import { Region, RegionIDSchema } from '@src/geo/region.model'
import { ProcessIDSchema } from '@src/process/process.schema'
import {
  Program as ProgramEntity,
  ProgramHistory as ProgramHistoryEntity,
  ProgramOrgRole,
  ProgramStatus,
} from '@src/process/program.entity'
import {
  CreateProgramInput,
  Program,
  ProgramHistory,
  ProgramSocialInput,
  UpdateProgramInput,
} from '@src/process/program.model'
import { TagDefinitionIDSchema } from '@src/process/tag.model'
import { OrgIDSchema } from '@src/users/org.schema'
import { User } from '@src/users/users.model'

export const ProgramIDSchema = z.string().meta({
  id: 'Program',
  name: 'Program ID',
})

export const ProgramOrgsInputSchema = z.strictObject({
  id: OrgIDSchema,
  // role is required: a present-but-unrecognized value (e.g. a legacy string) is rescued to
  // OTHER, but an omitted role still fails validation rather than defaulting silently
  role: z.preprocess((val) => {
    if (typeof val !== 'string') return val
    return Object.values(ProgramOrgRole).includes(val as ProgramOrgRole)
      ? val
      : ProgramOrgRole.OTHER
  }, z.enum(ProgramOrgRole)),
})

export const ProgramProcessesInputSchema = z.strictObject({
  id: ProcessIDSchema,
})

export const ProgramTagsInputSchema = z.strictObject({
  id: TagDefinitionIDSchema,
  meta: RelMetaSchema,
})

// Input variants, to keep server-only link fields out of programSchema's JSON Schema
export const ProgramSocialInputSchema = z.object({
  links: z.array(ExternalLinkInputSchema).optional(),
  phones: z.array(PhoneEntrySchema).optional(),
  address: z.string().max(1024).optional(),
  addressTr: TrArraySchema,
})

export const ProgramInstructionsInputSchema = z.object({
  primaryLinks: z.array(ExternalLinkInputSchema).optional(),
})

@Injectable()
@IsSchemaService(ProgramEntity)
export class ProgramSchemaService implements ISchemaService<ProgramEntity> {
  OutputModel = Program
  CreateInputModel = CreateProgramInput
  UpdateInputModel = UpdateProgramInput

  ProgramOrgsInputSchema
  ProgramProcessesInputSchema
  ProgramTagsInputSchema
  CreateSchema
  CreateJSONSchema: z.core.JSONSchema.BaseSchema
  CreateValidator: ValidateFunction
  CreateUISchema: UISchemaElement
  UpdateSchema
  UpdateJSONSchema: z.core.JSONSchema.BaseSchema
  UpdateValidator: ValidateFunction
  UpdateUISchema: UISchemaElement

  constructor(
    private readonly i18n: I18nService,
    private readonly baseSchema: BaseSchemaService,
    private readonly zService: ZService,
  ) {
    const ProgramTransform = z.transform(async (input: TransformInput) => {
      const entity = input.input as ProgramEntity
      const model = new Program()
      model.id = entity.id
      model.createdAt = DateTime.fromJSDate(entity.createdAt)
      model.updatedAt = DateTime.fromJSDate(entity.updatedAt)
      model.name = input.i18n.tr(entity.name) as string
      model.desc = input.i18n.tr(entity.desc)
      model.social = entity.social
        ? {
            links: input.i18n.filterByLocale(entity.social.links),
            phones: entity.social.phones,
            address: input.i18n.tr(entity.social.address),
          }
        : undefined
      model.instructions = entity.instructions
        ? { primaryLink: input.i18n.pickByLocale(entity.instructions.primaryLinks) }
        : undefined
      model.status = entity.status
      model.region = await this.zService.refToModel(Region, entity.region)
      return model
    })
    this.zService.registerEntityTransform(ProgramEntity, Program, ProgramTransform)

    const ProgramHistoryTransform = z.transform((input: TransformInput) => {
      const entity = input.input as ProgramHistoryEntity
      const model = new ProgramHistory()
      model.datetime = DateTime.fromJSDate(entity.datetime)
      model.user = entity.user as unknown as User & {}
      model.original = entity.original as Program | undefined
      model.changes = entity.changes as Program | undefined
      return model
    })
    this.zService.registerEntityTransform(
      ProgramHistoryEntity,
      ProgramHistory,
      ProgramHistoryTransform,
    )

    this.ProgramOrgsInputSchema = ProgramOrgsInputSchema
    this.ProgramProcessesInputSchema = ProgramProcessesInputSchema
    this.ProgramTagsInputSchema = ProgramTagsInputSchema

    this.CreateSchema = ChangeInputWithLangSchema.extend({
      name: z.string().min(1).max(1024).optional(),
      nameTr: TrArraySchema,
      desc: z.string().max(100_000).optional(),
      descTr: TrArraySchema,
      social: ProgramSocialInputSchema.optional(),
      instructions: ProgramInstructionsInputSchema.optional(),
      status: z.enum(ProgramStatus).default(ProgramStatus.ACTIVE),
      region: RegionIDSchema.optional(),
      orgs: z.array(this.ProgramOrgsInputSchema).optional(),
      processes: z.array(this.ProgramProcessesInputSchema).optional(),
      tags: z.array(this.ProgramTagsInputSchema).optional(),
    }).superRefine(requireNameOrNameTr)

    this.CreateJSONSchema = zToSchema(this.CreateSchema)
    this.CreateUISchema = {
      type: 'VerticalLayout',
      elements: [
        {
          type: 'Control',
          scope: '#/properties/nameTr',
          label: 'Name Translations',
          options: this.baseSchema.trOptionsUISchema(),
        },
        {
          type: 'Control',
          scope: '#/properties/descTr',
          label: 'Description Translations',
          options: this.baseSchema.trOptionsUISchema(),
        },
        {
          type: 'Control',
          scope: '#/properties/social',
          label: 'Social',
        },
        {
          type: 'Control',
          scope: '#/properties/instructions',
          label: 'Instructions',
        },
        {
          type: 'Control',
          scope: '#/properties/status',
          label: 'Status',
        },
        {
          type: 'Control',
          scope: '#/properties/region',
          label: 'Region',
        },
        {
          type: 'Control',
          scope: '#/properties/orgs',
          label: 'Organizations',
        },
        {
          type: 'Control',
          scope: '#/properties/processes',
          label: 'Processes',
        },
        {
          type: 'Control',
          scope: '#/properties/tags',
          label: 'Tags',
        },
      ],
    }

    this.UpdateSchema = ChangeInputWithLangSchema.extend({
      id: ProgramIDSchema,
      name: z.string().min(1).max(1024).optional(),
      nameTr: TrArraySchema.optional(),
      desc: z.string().max(100_000).optional(),
      descTr: TrArraySchema.optional(),
      social: ProgramSocialInputSchema.optional(),
      instructions: ProgramInstructionsInputSchema.optional(),
      status: z.enum(ProgramStatus).optional(),
      region: RegionIDSchema.optional(),
      orgs: z.array(this.ProgramOrgsInputSchema).optional(),
      addOrgs: z.array(this.ProgramOrgsInputSchema).optional(),
      removeOrgs: z.array(z.string()).optional(),
      processes: z.array(this.ProgramProcessesInputSchema).optional(),
      addProcesses: z.array(this.ProgramProcessesInputSchema).optional(),
      removeProcesses: z.array(z.string()).optional(),
      tags: z.array(this.ProgramTagsInputSchema).optional(),
      addTags: z.array(this.ProgramTagsInputSchema).optional(),
      removeTags: z.array(z.string()).optional(),
    })
    this.UpdateJSONSchema = zToSchema(this.UpdateSchema)
    this.UpdateUISchema = {
      type: 'VerticalLayout',
      elements: [
        {
          type: 'Control',
          scope: '#/properties/nameTr',
          label: 'Name Translations',
          options: this.baseSchema.trOptionsUISchema(),
        },
        {
          type: 'Control',
          scope: '#/properties/descTr',
          label: 'Description Translations',
          options: this.baseSchema.trOptionsUISchema(),
        },
        {
          type: 'Control',
          scope: '#/properties/social',
          label: 'Social',
        },
        {
          type: 'Control',
          scope: '#/properties/instructions',
          label: 'Instructions',
        },
        {
          type: 'Control',
          scope: '#/properties/status',
          label: 'Status',
        },
        {
          type: 'Control',
          scope: '#/properties/region',
          label: 'Region',
        },
        {
          type: 'Control',
          scope: '#/properties/orgs',
          label: 'Organizations',
        },
        {
          type: 'Control',
          scope: '#/properties/addOrgs',
          label: 'Add Organizations',
        },
        {
          type: 'Control',
          scope: '#/properties/removeOrgs',
          label: 'Remove Organizations',
        },
        {
          type: 'Control',
          scope: '#/properties/processes',
          label: 'Processes',
        },
        {
          type: 'Control',
          scope: '#/properties/addProcesses',
          label: 'Add Processes',
        },
        {
          type: 'Control',
          scope: '#/properties/removeProcesses',
          label: 'Remove Processes',
        },
        {
          type: 'Control',
          scope: '#/properties/tags',
          label: 'Tags',
        },
        {
          type: 'Control',
          scope: '#/properties/addTags',
          label: 'Add Tags',
        },
        {
          type: 'Control',
          scope: '#/properties/removeTags',
          label: 'Remove Tags',
        },
      ],
    }
    this.CreateValidator = this.baseSchema.ajv.compile(this.CreateJSONSchema)
    this.UpdateValidator = this.baseSchema.ajv.compile(this.UpdateJSONSchema)
  }

  async parseCreateInput(input: any) {
    return this.zService.parse(this.CreateSchema, input)
  }

  async parseUpdateInput(input: any) {
    return this.zService.parse(this.UpdateSchema, input)
  }

  async createInputModel(entity: ProgramEntity | null): Promise<any> {
    if (!entity) {
      return {}
    }
    const data: CreateProgramInput = {
      status: entity.status,
      instructions: entity.instructions,
    }
    this.baseSchema.applyTranslatedField(data, entity.name, 'name', 'nameTr')
    this.baseSchema.applyTranslatedField(data, entity.desc, 'desc', 'descTr')
    if (entity.social) {
      const social: ProgramSocialInput = {
        links: entity.social.links,
        phones: entity.social.phones,
      }
      this.baseSchema.applyTranslatedField(social, entity.social.address, 'address', 'addressTr')
      data.social = social
    }
    data.orgs = this.baseSchema.collectionToInput(
      this.baseSchema.safeCollectionItems(entity.programOrgs),
      'program',
      'org',
    )
    data.processes = this.baseSchema.collectionToInput(
      this.baseSchema.safeCollectionItems(entity.programProcesses),
      'program',
      'process',
    )
    data.tags = this.baseSchema.collectionToInput(
      this.baseSchema.safeCollectionItems(entity.programTags),
      'program',
      'tag',
    )
    if (entity.region?.id) {
      data.region = entity.region.id
    }
    this.CreateValidator(data)
    return this.zService.parse(this.CreateSchema, data)
  }

  async updateInputModel(entity: ProgramEntity): Promise<any> {
    const data: UpdateProgramInput = {
      id: entity.id,
      status: entity.status,
      instructions: entity.instructions,
    }
    this.baseSchema.applyTranslatedField(data, entity.name, 'name', 'nameTr')
    this.baseSchema.applyTranslatedField(data, entity.desc, 'desc', 'descTr')
    if (entity.social) {
      const social: ProgramSocialInput = {
        links: entity.social.links,
        phones: entity.social.phones,
      }
      this.baseSchema.applyTranslatedField(social, entity.social.address, 'address', 'addressTr')
      data.social = social
    }
    data.orgs = this.baseSchema.collectionToInput(
      this.baseSchema.safeCollectionItems(entity.programOrgs),
      'program',
      'org',
    )
    data.processes = this.baseSchema.collectionToInput(
      this.baseSchema.safeCollectionItems(entity.programProcesses),
      'program',
      'process',
    )
    data.tags = this.baseSchema.collectionToInput(
      this.baseSchema.safeCollectionItems(entity.programTags),
      'program',
      'tag',
    )
    if (entity.region?.id) {
      data.region = entity.region.id
    }
    this.UpdateValidator(data)
    return this.zService.parse(this.UpdateSchema, data)
  }
}
