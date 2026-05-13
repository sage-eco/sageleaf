import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { I18nService } from '@src/common/i18n.service'
import { TransformService } from '@src/common/transform'
import { LocationService } from '@src/geo/location.service'
import { Place } from '@src/geo/place.model'
import { Component } from '@src/process/component.entity'
import { MaterialTree } from '@src/process/material.entity'
import { Process, ProcessIntent } from '@src/process/process.entity'
import { Program } from '@src/process/program.model'
import {
  ComponentRecycle,
  ComponentReduce,
  ComponentReuse,
  RecyclingStream,
  ReduceStream,
  ReuseStream,
  StreamCaveats,
  StreamProgram,
  StreamProgramsArgs,
  StreamScore,
  StreamScoreRating,
} from '@src/process/stream.model'
import { Org } from '@src/users/org.model'

const RECYCLE_INTENTS = [
  ProcessIntent.RECYCLE,
  ProcessIntent.ENERGY_RECOVERY,
  ProcessIntent.LANDFILL,
]
const REDUCE_INTENTS = [ProcessIntent.REDUCE]
const REUSE_INTENTS = [
  ProcessIntent.REUSE,
  ProcessIntent.REPAIR,
  ProcessIntent.REFURBISH,
  ProcessIntent.REMANUFACTURE,
  ProcessIntent.REPURPOSE,
]

@Injectable()
export class StreamService {
  constructor(
    private readonly em: EntityManager,
    private readonly i18n: I18nService,
    private readonly locationService: LocationService,
    private readonly transform: TransformService,
  ) {}

  async recycleComponent(componentId: string, regionId?: string) {
    const matches = await this.findProcessesForComponent(componentId, regionId, RECYCLE_INTENTS)
    return matches.map(({ process, component }) => this.buildComponentRecycle(process, component))
  }

  async reduceComponent(componentId: string, regionId?: string) {
    const matches = await this.findProcessesForComponent(componentId, regionId, REDUCE_INTENTS)
    return matches.map(({ process, component }) => this.buildComponentReduce(process, component))
  }

  async reuseComponent(componentId: string, regionId?: string) {
    const matches = await this.findProcessesForComponent(componentId, regionId, REUSE_INTENTS)
    return matches.map(({ process, component }) => this.buildComponentReuse(process, component))
  }

  async findProcessesForComponent(
    componentId: string,
    regionId?: string,
    intents?: ProcessIntent[],
  ): Promise<Array<{ process: Process; component: Component }>> {
    const component = await this.em.findOne(
      Component,
      { id: componentId },
      { populate: ['primaryMaterial', 'materials', 'tags'] },
    )
    if (!component) return []

    const regionSearch = await this.locationService.resolveLocation(regionId)
    if (!regionSearch?.length) return []

    // Exclude composite materials that are descendants of the primaryMaterial
    const descendants = await this.em.find(MaterialTree, { ancestor: component.primaryMaterial.id })
    const descendantIds = new Set(
      descendants.filter((d) => Number(d.depth) > 0).map((d) => d.descendant.id),
    )

    const materialSearch = [component.primaryMaterial.id]
    for (const material of component.materials.getItems()) {
      if (!descendantIds.has(material.id)) {
        materialSearch.push(material.id)
      }
    }

    const where: Record<string, any> = {
      material: { id: { $in: materialSearch } },
      region: { id: { $in: regionSearch } },
    }
    if (intents?.length) {
      where.intent = { $in: intents }
    }

    const processes = await this.em.find(Process, where)

    return processes.map((process) => ({ process, component }))
  }

  buildStream(process: Process, components: Component[]): RecyclingStream {
    const s = new RecyclingStream()
    s.processId = process.id
    s.name = this.i18n.tr(process.name)
    s.desc = this.i18n.tr(process.desc)
    s.score = this.calculateScore(process)
    s.container = process.instructions.container
    const caveats: StreamCaveats[] = []
    for (const component of components) {
      for (const tag of component.tags) {
        for (const rule of tag.rules?.recycle ?? []) {
          if (rule.caveat) {
            const c = new StreamCaveats()
            c.level = rule.caveat.level
            c.name = this.i18n.tr(rule.caveat.name)
            c.desc = this.i18n.tr(rule.caveat.desc)
            caveats.push(c)
          }
        }
      }
    }
    s.caveats = caveats
    return s
  }

  buildReduceStream(process: Process): ReduceStream {
    const s = new ReduceStream()
    s.processId = process.id
    s.name = this.i18n.tr(process.name)
    s.desc = this.i18n.tr(process.desc)
    s.score = this.calculateScore(process)
    return s
  }

  buildReuseStream(process: Process): ReuseStream {
    const s = new ReuseStream()
    s.processId = process.id
    s.name = this.i18n.tr(process.name)
    s.desc = this.i18n.tr(process.desc)
    s.score = this.calculateScore(process)
    s.container = process.instructions.container
    return s
  }

  private buildComponentRecycle(process: Process, component: Component): ComponentRecycle {
    return Object.assign(new ComponentRecycle(), {
      stream: this.buildStream(process, [component]),
      context: [],
    })
  }

  private buildComponentReduce(process: Process, _component: Component): ComponentReduce {
    return Object.assign(new ComponentReduce(), {
      stream: this.buildReduceStream(process),
      context: [],
    })
  }

  private buildComponentReuse(process: Process, _component: Component): ComponentReuse {
    return Object.assign(new ComponentReuse(), {
      stream: this.buildReuseStream(process),
      context: [],
    })
  }

  async recycleComponentScore(componentId: string, regionId?: string) {
    const recycle = await this.recycleComponent(componentId, regionId)
    return this.averageStreamScore(recycle)
  }

  async reduceComponentScore(componentId: string, regionId?: string) {
    const reduce = await this.reduceComponent(componentId, regionId)
    return this.averageStreamScore(reduce)
  }

  async reuseComponentScore(componentId: string, regionId?: string) {
    const reuse = await this.reuseComponent(componentId, regionId)
    return this.averageStreamScore(reuse)
  }

  private averageStreamScore(entries: Array<{ stream?: { score?: StreamScore } }>) {
    if (!entries.length) return null
    const score = new StreamScore()
    let totalScore = 0
    let validScores = 0
    for (const r of entries) {
      if (r.stream?.score?.score) {
        totalScore += r.stream.score.score
        validScores++
      }
    }
    score.score = validScores > 0 ? totalScore / validScores : undefined
    score.rating = validScores > 0 ? StreamScoreRating.B : StreamScoreRating.UNKNOWN
    score.ratingF = this.i18n.t(`stream.scoreRating.${score.rating}`)
    return score
  }

  calculateScore(process: Process) {
    const score = new StreamScore()
    if (process.efficiency && process.efficiency.efficiency) {
      score.score = process.efficiency.efficiency * 100
      score.rating = StreamScoreRating.B
    } else {
      score.rating = StreamScoreRating.UNKNOWN
    }
    score.ratingF = this.i18n.t(`stream.scoreRating.${score.rating}`)
    return score
  }

  async findProgramsForProcess(
    processId: string,
    args: StreamProgramsArgs,
  ): Promise<{ items: StreamProgram[]; count: number }> {
    const process = await this.em.findOne(
      Process,
      { id: processId },
      { populate: ['programs', 'programs.orgs', 'place'] },
    )
    if (!process) return { items: [], count: 0 }

    const placeModel = process.place?.isInitialized()
      ? await this.transform.entityToModel(Place, process.place)
      : undefined

    const rows: StreamProgram[] = []
    for (const programEntity of process.programs) {
      if (
        args.query &&
        !JSON.stringify(programEntity.name).toLowerCase().includes(args.query.toLowerCase())
      ) {
        continue
      }
      const programModel = await this.transform.entityToModel(Program, programEntity)
      const orgs = programEntity.orgs.isInitialized() ? programEntity.orgs.getItems() : []
      if (orgs.length === 0) {
        const row = new StreamProgram()
        row.program = programModel
        row.place = placeModel
        rows.push(row)
      } else {
        for (const orgEntity of orgs) {
          const orgModel = await this.transform.entityToModel(Org, orgEntity)
          const row = new StreamProgram()
          row.program = programModel
          row.org = orgModel
          row.place = placeModel
          rows.push(row)
        }
      }
    }
    return { items: rows, count: rows.length }
  }
}
