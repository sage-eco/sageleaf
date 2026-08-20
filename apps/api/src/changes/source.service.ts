import { EntityManager, ref } from '@mikro-orm/postgresql'
import { ForbiddenException, Injectable } from '@nestjs/common'
import type { FileUpload } from 'graphql-upload/processRequest.mjs'
import jsonld from 'jsonld'

import { Change } from '@src/changes/change.entity'
import { Source } from '@src/changes/source.entity'
import {
  CreateSourceInput,
  LinkSourceInput,
  UnlinkSourceInput,
  UpdateSourceInput,
} from '@src/changes/source.model'
import { JSONLD_CONTEXT } from '@src/changes/source.schema'
import { NotFoundErr } from '@src/common/exceptions'
import { StorageService } from '@src/common/storage.service'
import { CursorOptions } from '@src/common/transform'
import { type JSONObject } from '@src/common/z.schema'
import { IEntityService, IsEntityService, QueryField } from '@src/db/base.entity'
import { User } from '@src/users/users.entity'

@Injectable()
@IsEntityService(Source)
export class SourceService implements IEntityService<Source> {
  constructor(
    private readonly em: EntityManager,
    private readonly storageService: StorageService,
  ) {}

  queryFields(): Record<string, QueryField> {
    return {}
  }

  async findManyByID(ids: string[]) {
    return this.em.find(Source, { id: { $in: ids } })
  }

  async user(userID: string) {
    return this.em.findOne(User, { id: userID })
  }

  async find(opts: CursorOptions<Source>) {
    const sources = await this.em.find(Source, opts.where, opts.options)
    const count = await this.em.count(Source, opts.where)
    return {
      items: sources,
      count,
    }
  }

  async findOneByID(id: string) {
    const source = await this.em.findOne(Source, { id }, { populate: ['user', 'changes'] })

    if (!source) {
      throw NotFoundErr(`Source with ID "${id}" not found`)
    }

    return source
  }

  async changes(sourceID: string, opts: CursorOptions<Change>) {
    opts.where.sources = this.em.getReference(Source, sourceID)
    const [items, count] = await this.em.findAndCount(Change, opts.where, opts.options)
    return {
      items,
      count,
    }
  }

  async create(input: CreateSourceInput, userID: string) {
    const source = new Source()
    source.user = ref(User, userID)
    await this.setFields(source, input)
    await this.em.persist(source).flush()
    return source
  }

  async upload(
    source: string,
    fileUpload: Promise<FileUpload>,
    userID: string,
    metadata?: JSONObject,
  ) {
    const entity = await this.findOneByID(source)

    if (entity.user.id !== userID) {
      throw new ForbiddenException('You do not have permission to upload to this source')
    }

    const { cdnUrl, sourceType } = await this.storageService.uploadSource(fileUpload)

    entity.type = sourceType
    entity.location = cdnUrl
    if (metadata) entity.metadata = { ...entity.metadata, extra: metadata }
    await this.em.flush()
    return entity
  }

  async update(input: UpdateSourceInput) {
    const source = await this.findOneByID(input.id)
    await this.setFields(source, input)
    await this.em.persist(source).flush()
    return source
  }

  async markProcessed(id: string) {
    const source = await this.findOneByID(id)
    source.processedAt = new Date()
    await this.em.persist(source).flush()
    return source
  }

  async remove(id: string) {
    const source = await this.findOneByID(id)
    await this.em.remove(source).flush()
    return true
  }

  private async expandJsonLdGraph(source: Source): Promise<jsonld.NodeObject[]> {
    const doc = source.content?.jsonld as JSONObject | undefined
    if (!doc?.['@graph']) return []
    return jsonld.expand(doc as jsonld.JsonLdDocument) as Promise<jsonld.NodeObject[]>
  }

  private async compactJsonLdGraph(graph: jsonld.NodeObject[]): Promise<JSONObject> {
    const compacted = await jsonld.compact(
      { '@graph': graph } as jsonld.JsonLdDocument,
      JSONLD_CONTEXT,
    )
    // jsonld.compact flattens single-node graphs to top level; normalize to always use @graph
    if (!compacted['@graph']) {
      const { '@context': ctx, ...node } = compacted
      return { '@context': ctx, '@graph': [node] } as JSONObject
    }
    return compacted as JSONObject
  }

  async link(input: LinkSourceInput) {
    const source = await this.em.findOne(Source, { id: input.id })
    if (!source) throw NotFoundErr(`Source with ID "${input.id}" not found`)
    const graph = await this.expandJsonLdGraph(source)
    const [expanded] = await jsonld.expand(input.jsonld as jsonld.JsonLdDocument)
    const idx = graph.findIndex((n) => n['@id'] === expanded['@id'])
    if (idx >= 0) graph[idx] = expanded
    else graph.push(expanded)
    source.content = { ...source.content, jsonld: await this.compactJsonLdGraph(graph) }
    await this.em.flush()
    return { source }
  }

  async unlink(input: UnlinkSourceInput) {
    const source = await this.em.findOne(Source, { id: input.id })
    if (!source) throw NotFoundErr(`Source with ID "${input.id}" not found`)
    const graph = await this.expandJsonLdGraph(source)
    if (graph.length === 0) return { source }
    const targetId = input.jsonld['@id'] as string
    const filtered = graph.filter((n) => n['@id'] !== targetId)
    source.content = { ...source.content, jsonld: await this.compactJsonLdGraph(filtered) }
    await this.em.flush()
    return { source }
  }

  async setFields(source: Source, input: Partial<CreateSourceInput & UpdateSourceInput>) {
    if (input.type) source.type = input.type
    if (input.text !== undefined) {
      source.content = { ...source.content, text: input.text }
    }
    if (input.contentURL) {
      source.contentURL = input.contentURL
    }
    if (input.metadata !== undefined) {
      source.metadata = { ...source.metadata, extra: input.metadata }
    }
  }
}
