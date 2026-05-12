import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { I18nService } from '@src/common/i18n.service'
import { LocationService } from '@src/geo/location.service'
import { Component } from '@src/process/component.entity'
import { MaterialTree } from '@src/process/material.entity'
import { Process } from '@src/process/process.entity'
import {
  CaveatLevel,
  ComponentRecycle,
  RecyclingStream,
  StreamCaveats,
  StreamScore,
  StreamScoreRating,
} from '@src/process/stream.model'

@Injectable()
export class StreamService {
  constructor(
    private readonly em: EntityManager,
    private readonly i18n: I18nService,
    private readonly locationService: LocationService,
  ) {}

  async recycleComponent(componentId: string, regionId?: string) {
    const matches = await this.findProcessesForComponent(componentId, regionId)
    return matches.map(({ process, component }) => this.buildComponentRecycle(process, component))
  }

  async findProcessesForComponent(
    componentId: string,
    regionId?: string,
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

    const processes = await this.em.find(Process, {
      material: { id: { $in: materialSearch } },
      region: { id: { $in: regionSearch } },
    })

    return processes.map((process) => ({ process, component }))
  }

  buildStream(process: Process, components: Component[]): RecyclingStream {
    const s = new RecyclingStream()
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
            c.level = rule.caveat.level as unknown as CaveatLevel
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

  private buildComponentRecycle(process: Process, component: Component): ComponentRecycle {
    return Object.assign(new ComponentRecycle(), {
      stream: this.buildStream(process, [component]),
      context: [],
    })
  }

  async recycleComponentScore(componentId: string, regionId?: string) {
    const recycle = await this.recycleComponent(componentId, regionId)
    if (!recycle) {
      return null
    }
    const score = new StreamScore()
    let totalScore = 0
    let validScores = 0
    for (const r of recycle) {
      if (r.stream && r.stream.score) {
        if (r.stream.score.score) {
          totalScore += r.stream.score.score
          validScores++
        }
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
}
