import { EntityManager, Loaded } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'
import { type JSONSchemaType } from 'ajv/dist/2020'

import { I18nService } from '@src/common/i18n.service'
import { CursorOptions } from '@src/common/transform'
import { AjvTemplateSchema, JSONObject } from '@src/common/z.schema'
import { IEntityService, IsEntityService, QueryField } from '@src/db/base.entity'
import { Tag, TagMetaTemplateSchema } from '@src/process/tag.entity'
import { CreateTagDefinitionInput, UpdateTagDefinitionInput } from '@src/process/tag.model'

export interface TagInput {
  id: string
  meta?: JSONObject
}

@Injectable()
@IsEntityService(Tag)
export class TagService implements IEntityService<Tag> {
  constructor(
    private readonly em: EntityManager,
    private readonly i18n: I18nService,
  ) {}

  queryFields(): Record<string, QueryField> {
    return {}
  }

  async findOneByID(id: string): Promise<Loaded<Tag> | null> {
    return await this.em.findOne(Tag, { id })
  }

  async findManyByID(ids: string[]): Promise<Loaded<Tag>[]> {
    return this.em.find(Tag, { id: { $in: ids } })
  }

  async find(opts: CursorOptions<Tag>) {
    const tags = await this.em.find(Tag, opts.where, opts.options)
    const count = await this.em.count(Tag, opts.where, { filters: opts.options.filters })
    return {
      items: tags,
      count,
    }
  }

  async create(input: CreateTagDefinitionInput) {
    const tag = new Tag()
    await this.setFields(tag, input)
    await this.em.persist(tag).flush()
    return tag
  }

  async update(input: UpdateTagDefinitionInput) {
    const tag = await this.em.findOne(Tag, { id: input.id })
    if (!tag) {
      throw new Error(`Tag with ID "${input.id}" not found`)
    }
    await this.setFields(tag, input)
    await this.em.persist(tag).flush()
    return tag
  }

  async validateTagInput(input: TagInput): Promise<Tag> {
    const tag = await this.em.findOne(Tag, { id: input.id })
    if (!tag) {
      throw new Error(`Tag with ID "${input.id}" not found`)
    }
    if (input.meta) {
      if (tag.metaTemplate && tag.metaTemplate.schema) {
        const validator = AjvTemplateSchema.compile(tag.metaTemplate.schema as JSONSchemaType<any>)
        const valid = validator(input.meta)
        if (!valid) {
          throw new Error(
            `Invalid meta data for tag "${tag.id}": ${AjvTemplateSchema.errorsText(validator.errors)}`,
          )
        }
        tag.meta = input.meta
      } else {
        throw new Error(`Tag "${tag.id}" does not have a meta template schema`)
      }
    }
    return tag
  }

  async setFields(tag: Tag, input: Partial<CreateTagDefinitionInput | UpdateTagDefinitionInput>) {
    if (input.name) {
      tag.name = this.i18n.addTrReq(tag.name, input.name)
    }
    tag.type = input.type ?? tag.type
    if (input.desc) {
      tag.desc = this.i18n.addTr(tag.desc, input.desc)
    }
    if (input.metaTemplate) {
      const metaTemplate = TagMetaTemplateSchema.parse(input.metaTemplate)
      tag.metaTemplate = metaTemplate ?? tag.metaTemplate
    }
    tag.bgColor = input.bgColor ?? tag.bgColor
    tag.image = input.image ?? tag.image
  }
}
