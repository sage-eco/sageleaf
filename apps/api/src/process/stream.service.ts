import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { I18nService } from '@src/common/i18n.service'
import { LocationService } from '@src/geo/location.service'
import { Component } from '@src/process/component.entity'
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
    const component = await this.em.findOne(
      Component,
      { id: componentId },
      { populate: ['primaryMaterial', 'materials', 'tags'] },
    )
    if (!component) {
      throw new Error(`Component with ID "${componentId}" not found`)
    }

    const regionSearch = await this.locationService.resolveLocation(regionId)
    if (!regionSearch || regionSearch.length === 0) {
      throw new Error('No region specified and no location resolved')
    }

    const materialSearch: string[] = []
    materialSearch.push(component.primaryMaterial.id)
    for (const material of component.materials.getItems()) {
      materialSearch.push(material.id)
    }

    // Search for processes that match this component
    const processes = await this.em.find(Process, {
      material: { id: { $in: materialSearch } },
      region: { id: { $in: regionSearch } },
    })

    const recycle: ComponentRecycle[] = []
    if (processes.length > 0) {
      const r = new ComponentRecycle()
      const processMatch = processes[0]
      r.stream = new RecyclingStream()
      r.stream.name = this.i18n.tr(processMatch.name)
      r.stream.desc = this.i18n.tr(processMatch.desc)
      r.stream.score = this.calculateScore(processMatch)
      r.stream.container = processMatch.instructions.container
      const caveats: StreamCaveats[] = []
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
      r.stream.caveats = caveats
      recycle.push(r)
    }
    return recycle
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
