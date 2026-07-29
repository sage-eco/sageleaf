import { BaseEntity, EntityManager, ref } from '@mikro-orm/postgresql'
import { Injectable, NotFoundException } from '@nestjs/common'
import type { Job as WmJob } from 'windmill-client'

import { AuthUserService } from '@src/auth/authuser.service'
import { CreateChangeInput } from '@src/changes/change-ext.model'
import { Change, ChangeEdits, ChangeStatus, StoredJob } from '@src/changes/change.entity'
import { EditModel as EditEnum, EditModelType } from '@src/changes/change.enum'
import { DirectEdit, Edit as EditModel, Job, UpdateChangeInput } from '@src/changes/change.model'
import { ChangeMapService } from '@src/changes/change_map.service'
import { EditService } from '@src/changes/edit.service'
import { Source } from '@src/changes/source.entity'
import { BadRequestErr, NotFoundErr } from '@src/common/exceptions'
import { MetaService } from '@src/common/meta.service'
import { CursorOptions, TransformService } from '@src/common/transform'
import { ZService } from '@src/common/z.service'
import { User } from '@src/users/users.entity'
import { WindmillService } from '@src/windmill/windmill.service'

const FLOW_NAMES: Record<string, string> = {
  // Add flow path → human-readable name mappings here as Windmill flows are defined, e.g.:
  'f/changes/review_change': 'Automatic Review',
  // 'f/changes/apply_edits': 'Apply Edits',
}

function mapToJobModel(wmJob: WmJob, stored: StoredJob): Job {
  const isCompleted = wmJob.type === 'CompletedJob'
  let status: string
  let progress: number

  if (isCompleted) {
    const completed = wmJob as WmJob & { type: 'CompletedJob' }
    status = completed.success ? 'completed' : completed.canceled ? 'canceled' : 'failed'
    progress = 100
  } else {
    const queued = wmJob as WmJob & { type: 'QueuedJob' }
    status = queued.canceled ? 'canceled' : queued.running ? 'running' : 'queued'
    if (queued.running && queued.flow_status) {
      const { step, modules } = queued.flow_status
      progress = modules.length > 0 ? Math.round((step / modules.length) * 100) : 50
    } else {
      progress = queued.running ? 50 : 0
    }
  }

  const job = new Job()
  job.id = wmJob.id
  job.name = FLOW_NAMES[wmJob.script_path ?? 'Unknown'] ?? stored.type
  job.status = status
  job.type = stored.type
  job.progress = progress
  return job
}

@Injectable()
export class ChangeService {
  constructor(
    private readonly em: EntityManager,
    private readonly transform: TransformService,
    private readonly zService: ZService,
    private readonly changeMapService: ChangeMapService,
    private readonly authUser: AuthUserService,
    private readonly editService: EditService,
    private readonly metaService: MetaService,
    private readonly windmill: WindmillService,
  ) {}

  async find(opts: CursorOptions<Change>) {
    const changes = await this.em.find(Change, opts.where, opts.options)
    const count = await this.em.count(Change, opts.where)
    return {
      items: changes,
      count,
    }
  }

  async findOne(id: string) {
    const change = await this.em.findOne(Change, { id }, { populate: ['user', 'sources', 'edits'] })

    if (!change) {
      throw new NotFoundException(`Change with ID "${id}" not found`)
    }

    return change
  }

  async edits(changeID: string, editID?: string, editType?: EditModelType) {
    const change = await this.em.findOne(Change, { id: changeID }, { populate: ['edits'] })
    if (!change) {
      throw NotFoundErr(`Change with ID "${changeID}" not found`)
    }
    if (editID) {
      const edit = change.edits.find(
        (e) => e.entityID === editID && (editType ? e.entityName === editType : true),
      )
      if (!edit) {
        throw NotFoundErr(`Edit with ID "${editID}" not found in change "${changeID}"`)
      }
      edit._type = EditModel
      const editModel = (await this.transform.entityToModel(EditModel, edit)) as EditModel
      editModel.originalJSON = edit.original
      editModel.changesJSON = edit.changes
      const changesEntity =
        edit.changes && edit.entityID
          ? await this.editService.changePOJOToEntity(edit.entityName, edit.changes)
          : null
      const svcResult1 = changesEntity
        ? this.metaService.findSchemaService(changesEntity.constructor)
        : null
      if (svcResult1) {
        const [, schemaSvc] = svcResult1
        editModel.createInput = await schemaSvc.createInputModel(changesEntity!)
        const updateInput = await schemaSvc.updateInputModel(changesEntity!)
        editModel.updateInput = updateInput
        if (updateInput) {
          const {
            id: _id,
            createdAt: _createdAt,
            updatedAt: _updatedAt,
            ...copyInput
          } = updateInput as any
          editModel.copyInput = copyInput
        }
      }
      return [editModel]
    }
    return Promise.all(
      change.edits.map(async (edit) => {
        edit._type = EditModel
        const editModel = (await this.transform.entityToModel(EditModel, edit)) as EditModel
        editModel.originalJSON = edit.original
        editModel.changesJSON = edit.changes
        const changesEntity =
          edit.changes && edit.entityID
            ? await this.editService.changePOJOToEntity(edit.entityName, edit.changes)
            : null
        const svcResult2 = changesEntity
          ? this.metaService.findSchemaService(changesEntity.constructor)
          : null
        if (svcResult2) {
          const [, schemaSvc] = svcResult2
          editModel.createInput = await schemaSvc.createInputModel(changesEntity!)
          const updateInput = await schemaSvc.updateInputModel(changesEntity!)
          editModel.updateInput = updateInput
          if (updateInput) {
            const {
              id: _id,
              createdAt: _createdAt,
              updatedAt: _updatedAt,
              ...copyInput
            } = updateInput as any
            editModel.copyInput = copyInput
          }
        }
        return editModel
      }),
    )
  }

  async directEdit(id?: string, entityName?: string, changeID?: string) {
    if (!entityName) {
      throw BadRequestErr('Must provide entity name for direct edit')
    }
    if (!this.metaService.findEntityService(entityName)) {
      throw BadRequestErr(`Cannot directly edit entity "${entityName}"`)
    }
    const [, svc] = this.metaService.findEntityService(entityName)!
    if (id) {
      const originalEntity = await svc.findOneByID(id)
      if (!originalEntity) {
        throw NotFoundErr(`Entity with ID "${id}" not found"`)
      }
      const svcResult = this.metaService.findSchemaService(originalEntity.constructor)
      if (!svcResult) {
        throw new Error(`No schema service found for entity "${originalEntity.constructor.name}"`)
      }
      const [, schemaService] = svcResult
      if (!schemaService) {
        throw new Error(`No schema service found for entity "${originalEntity.constructor.name}"`)
      }
      let changesEntity: any = null
      if (changeID) {
        const edit = await this.em.findOne(
          ChangeEdits,
          { change: changeID, entityID: id, entityName },
          { populate: ['change'] },
        )
        if (edit && edit.changes) {
          changesEntity = await this.editService.changePOJOToEntity(entityName, edit.changes)
        }
      }
      if (originalEntity) {
        if (!(originalEntity as any).id) {
          throw NotFoundErr(`Entity with ID "${id}" not found`)
        }
        const originalModel = await this.zService.entityToModel(
          schemaService.OutputModel,
          originalEntity as BaseEntity,
        )
        const changesModel = changesEntity
          ? await this.zService.entityToModel(schemaService.OutputModel, changesEntity)
          : originalModel
        const directEdit = new DirectEdit()
        directEdit.id = (originalEntity as any).id
        directEdit.entityName = entityName
        directEdit.original = originalModel as typeof EditEnum
        directEdit.changes = changesModel as typeof EditEnum
        const updateInput = await schemaService.updateInputModel(changesEntity ?? originalEntity)
        directEdit.updateInput = updateInput
        if (updateInput) {
          const {
            id: _id,
            createdAt: _createdAt,
            updatedAt: _updatedAt,
            ...copyInput
          } = updateInput as any
          directEdit.copyInput = copyInput
        }
        return directEdit
      }
    } else if (entityName) {
      const editModel = new DirectEdit()
      editModel.entityName = entityName
      const entityMeta = this.em.getMetadata().get(entityName)
      const createSvcResult = entityMeta
        ? this.metaService.findSchemaService(entityMeta.class)
        : null
      if (createSvcResult) {
        const [, schemaSvc] = createSvcResult
        editModel.createInput = await schemaSvc.createInputModel(null as any)
      }
      return editModel
    }
    return null
  }

  async sources(changeID: string, opts: CursorOptions<Source>) {
    opts.where.changes = this.em.getReference(Change, changeID)
    const sources = await this.em.find(Source, opts.where, opts.options)
    const count = await this.em.count(Source, { changes: opts.where.changes })
    return {
      items: sources,
      count,
    }
  }

  async user(userID: string) {
    return this.em.findOne(User, { id: userID })
  }

  async create(input: CreateChangeInput, userID: string) {
    const change = new Change()
    change.title = input.title
    change.description = input.description
    change.user = ref(User, userID)
    change.status = input.status || ChangeStatus.DRAFT

    if (input.sources && input.sources.length > 0) {
      const sources = await this.em.find(
        Source,
        {
          id: { $in: input.sources },
        },
        { fields: ['id'] },
      )
      for (const source of sources) {
        change.sources.add(ref(source.id))
      }
    }

    await this.em.persist(change).flush()
    return change
  }

  async update(input: UpdateChangeInput) {
    const change = await this.findOne(input.id)
    if (!this.authUser.sameUserOrAdmin(change.user.id)) {
      throw BadRequestErr('You can only update your own changes')
    }

    if (input.title) change.title = input.title
    if (input.description) change.description = input.description
    if (input.status) change.status = input.status
    if (input.sources) {
      const removed = change.sources.filter((source) => !input.sources!.includes(source.id))
      for (const source of removed) {
        change.sources.remove(source)
      }
      for (const sourceID of input.sources) {
        if (!change.sources.contains(ref(sourceID))) {
          const source = await this.em.findOne(Source, { id: sourceID })
          if (source) {
            change.sources.add(source)
          }
        }
      }
    }

    await this.em.persist(change).flush()
    return change
  }

  async remove(id: string) {
    const change = await this.findOne(id)
    if (!this.authUser.sameUserOrAdmin(change.user.id)) {
      throw BadRequestErr('You can only delete your own changes')
    }
    await this.em.remove(change).flush()
  }

  async jobs(changeId: string, active?: boolean): Promise<Job[]> {
    const change = await this.em.findOne(Change, { id: changeId })
    const stored = change?.metadata?.jobs ?? []
    const jobs = await Promise.all(
      stored.map(async (s) => {
        const wmJob = await this.windmill.getJob(s.id)
        return mapToJobModel(wmJob, s)
      }),
    )
    if (active === true) {
      return jobs.filter((j) => j.status === 'queued' || j.status === 'running')
    }
    return jobs
  }

  async discardEdit(changeID: string, editID: string) {
    const change = await this.findOne(changeID)
    if (!change) {
      throw NotFoundErr('Change not found')
    }
    if (!this.authUser.sameUserOrAdmin(change.user.id)) {
      throw BadRequestErr('You can only discard edits on your own changes')
    }
    const edit = change.edits.find((e) => e.entityID === editID)
    if (!edit) {
      throw NotFoundErr('Edit not found')
    }
    change.edits.remove(edit)
    await this.em.flush()
    return editID
  }
}
