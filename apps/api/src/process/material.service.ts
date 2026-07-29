import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { CursorOptions } from '@src/common/transform'
import { IEntityService, IsEntityService, QueryField } from '@src/db/base.entity'
import { Component } from '@src/process/component.entity'
import { Material, MATERIAL_ROOT, MaterialEdge, MaterialTree } from '@src/process/material.entity'
import { Process } from '@src/process/process.entity'

@Injectable()
@IsEntityService(Material)
export class MaterialService implements IEntityService<Material> {
  constructor(private readonly em: EntityManager) {}

  queryFields(): Record<string, QueryField> {
    return {}
  }

  async find(opts: CursorOptions<Material>) {
    const materials = await this.em.find(Material, opts.where, opts.options)
    const count = await this.em.count(Material, opts.where)
    return {
      items: materials,
      count,
    }
  }

  async findOneByID(id: string) {
    return await this.em.findOne(
      Material,
      { id },
      { populate: ['parents', 'children', 'ancestors', 'descendants'] },
    )
  }

  async findManyByID(ids: string[]) {
    return this.em.find(Material, { id: { $in: ids } })
  }

  async findRoot() {
    const root = await this.em.findOne(Material, { id: MATERIAL_ROOT })
    return root
  }

  async findParents(childID: string, opts: CursorOptions<Material>) {
    const parents = await this.em
      .createQueryBuilder(MaterialEdge)
      .joinAndSelect('parent', 'parent')
      .where({
        child: childID,
      })
      .limit(opts.options.limit)
      .getResult()
    return {
      items: parents.map((p) => p.parent) as Material[],
      count: parents.length,
    }
  }

  async findChildren(parentID: string, opts: CursorOptions<Material>) {
    const children = await this.em
      .createQueryBuilder(MaterialEdge)
      .joinAndSelect('child', 'child')
      .where({
        parent: parentID,
      })
      .limit(opts.options.limit)
      .getResult()
    return {
      items: children.map((c) => c.child) as Material[],
      count: children.length,
    }
  }

  async findDirectAncestors(materialID: string, opts: CursorOptions<Material>) {
    const ancestors = await this.em
      .createQueryBuilder(MaterialTree, 't')
      .joinAndSelect('ancestor', 'ancestor')
      .where({
        descendant: materialID,
        ancestor: { $ne: materialID },
        't.depth': '1',
      })
      .limit(opts.options.limit)
      .getResult()
    return {
      items: ancestors.map((a) => a.ancestor) as Material[],
      count: ancestors.length,
    }
  }

  async findDirectDescendants(materialID: string, opts: CursorOptions<Material>) {
    const descendants = await this.em
      .createQueryBuilder(MaterialTree, 't')
      .joinAndSelect('descendant', 'descendant')
      .where({
        ancestor: materialID,
        descendant: { $ne: materialID },
        't.depth': '1',
      })
      .limit(opts.options.limit)
      .getResult()
    return {
      items: descendants.map((d) => d.descendant) as Material[],
      count: descendants.length,
    }
  }

  async primaryComponents(materialID: string, opts: CursorOptions<Component>) {
    opts.where.materials = materialID
    const components = await this.em.find(Component, opts.where, opts.options)
    const count = await this.em.count(Component, {
      materials: opts.where.materials,
    })
    return {
      items: components,
      count,
    }
  }

  async components(materialID: string, opts: CursorOptions<Component>) {
    opts.where.materials = materialID
    const components = await this.em.find(Component, opts.where, opts.options)
    const count = await this.em.count(Component, {
      materials: opts.where.materials,
    })
    return {
      items: components,
      count,
    }
  }

  async processes(materialID: string, opts: CursorOptions<Process>) {
    opts.where.material = materialID
    const processes = await this.em.find(Process, opts.where, opts.options)
    const count = await this.em.count(Process, {
      material: opts.where.material,
    })
    return {
      items: processes,
      count,
    }
  }
}
