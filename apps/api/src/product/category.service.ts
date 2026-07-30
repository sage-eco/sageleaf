import { EntityManager } from '@mikro-orm/postgresql'
import { Injectable } from '@nestjs/common'

import { DeleteInput, isUsingChange } from '@src/changes/change-ext.model'
import { Change } from '@src/changes/change.entity'
import { EditService } from '@src/changes/edit.service'
import { NotFoundErr } from '@src/common/exceptions'
import { I18nService } from '@src/common/i18n.service'
import { CursorOptions } from '@src/common/transform'
import { IEntityService, IsEntityService, QueryField } from '@src/db/base.entity'
import {
  Category,
  CATEGORY_ROOT,
  CategoryEdge,
  CategoryHistory,
  CategoryTree,
} from '@src/product/category.entity'
import { CreateCategoryInput, UpdateCategoryInput } from '@src/product/category.model'
import { Item } from '@src/product/item.entity'

@Injectable()
@IsEntityService(Category)
export class CategoryService implements IEntityService<Category> {
  constructor(
    private readonly em: EntityManager,
    private readonly editService: EditService,
    private readonly i18n: I18nService,
  ) {}

  queryFields(): Record<string, QueryField> {
    return {}
  }

  async find(opts: CursorOptions<Category>) {
    const categories = await this.em.find(Category, opts.where, opts.options)
    const count = await this.em.count(Category, opts.where)
    return {
      items: categories,
      count,
    }
  }

  async findOneByID(id: string) {
    return await this.em.findOne(
      Category,
      { id },
      { populate: ['parents', 'children', 'ancestors', 'descendants'] },
    )
  }

  async findManyByID(ids: string[]) {
    return this.em.find(Category, { id: { $in: ids } })
  }

  async findRoot() {
    const root = await this.em.findOne(Category, { id: CATEGORY_ROOT })
    return root as Category
  }

  async findParents(childID: string, opts: CursorOptions<Category>) {
    const parents = await this.em
      .createQueryBuilder(CategoryEdge)
      .joinAndSelect('parent', 'parent')
      .where({
        child: childID,
      })
      .limit(opts.options.limit)
      .getResult()
    return {
      items: parents.map((p) => p.parent) as Category[],
      count: parents.length,
    }
  }

  async findChildren(parentID: string, opts: CursorOptions<Category>) {
    const children = await this.em
      .createQueryBuilder(CategoryEdge)
      .joinAndSelect('child', 'child')
      .where({
        parent: parentID,
      })
      .limit(opts.options.limit)
      .getResult()
    return {
      items: children.map((c) => c.child) as Category[],
      count: children.length,
    }
  }

  async findDirectAncestors(categoryID: string, opts: CursorOptions<Category>) {
    const ancestors = await this.em
      .createQueryBuilder(CategoryTree, 't')
      .joinAndSelect('ancestor', 'ancestor')
      .where({
        descendant: categoryID,
        ancestor: { $ne: categoryID },
        't.depth': '1',
      })
      .limit(opts.options.limit)
      .getResult()
    return {
      items: ancestors.map((a) => a.ancestor) as Category[],
      count: ancestors.length,
    }
  }

  async findDirectDescendants(categoryID: string, opts: CursorOptions<Category>) {
    const descendants = await this.em
      .createQueryBuilder(CategoryTree, 't')
      .joinAndSelect('descendant', 'descendant')
      .where({
        ancestor: categoryID,
        descendant: { $ne: categoryID },
        't.depth': '1',
      })
      .limit(opts.options.limit)
      .getResult()
    return {
      items: descendants.map((d) => d.descendant) as Category[],
      count: descendants.length,
    }
  }

  async findAll(opts: CursorOptions<Category>) {
    const categories = await this.em.find(Category, opts.where, opts.options)
    const count = await this.em.count(Category, opts.where)
    return {
      items: categories,
      count,
    }
  }

  async items(categoryID: string, opts: CursorOptions<Item>) {
    opts.where.categories = this.em.getReference(Category, categoryID)
    const items = await this.em.find(Item, opts.where, opts.options)
    const count = await this.em.count(Item, opts.where)
    return {
      items,
      count,
    }
  }

  async create(input: CreateCategoryInput, userID: string) {
    const category = new Category()
    if (!isUsingChange(input)) {
      this.editService.assertDirectCreateAllowed()
      await this.setFields(category, input)
      await this.editService.createHistory(
        Category.name,
        userID,
        undefined,
        this.editService.entityToChangePOJO(Category.name, category),
      )
      await this.em.persist(category).flush()
      return { category }
    }
    const change = await this.editService.findOneOrCreate(input.changeID, input.change, userID)
    await this.setFields(category, input, change)
    await this.editService.createEntityEdit(change, category)
    await this.editService.persistChange(change)
    await this.editService.checkMerge(change, input)
    return {
      change,
      category,
    }
  }

  async update(input: UpdateCategoryInput, userID: string) {
    const { entity: category, change } = await this.editService.findOneWithChangeInput(
      input,
      userID,
      Category,
      {
        id: input.id,
      },
      { populate: ['parents', 'children', 'ancestors', 'descendants'] },
    )
    if (!category) {
      throw new Error(`Category with ID "${input.id}" not found`)
    }
    if (!change) {
      const original = this.editService.entityToChangePOJO(Category.name, category)
      await this.setFields(category, input)
      await this.editService.createHistory(
        Category.name,
        userID,
        original,
        this.editService.entityToChangePOJO(Category.name, category),
      )
      await this.em.persist(category).flush()
      return {
        category,
        change: null,
      }
    }
    await this.editService.beginUpdateEntityEdit(change, category)
    await this.setFields(category, input, change)
    await this.editService.updateEntityEdit(change, category)
    const currentCategory = await this.editService.findOneForChange(this.em, change, Category, {
      id: input.id,
    })
    await this.editService.persistChange(change)
    await this.editService.checkMerge(change, input)
    return {
      change,
      category,
      currentCategory: currentCategory ?? undefined,
    }
  }

  async delete(input: DeleteInput) {
    const deleted = await this.editService.deleteOneWithChange(input, Category)
    if (!deleted) {
      throw NotFoundErr(`Category with ID "${input.id}" not found`)
    }
    return deleted
  }

  async history(categoryID: string, opts: CursorOptions<CategoryHistory>) {
    const items = await this.em.find(
      CategoryHistory,
      { category: categoryID },
      {
        populate: ['user'],
        orderBy: { datetime: 'ASC' },
        limit: opts.options.limit,
        offset: opts.options.offset,
      },
    )
    const count = await this.em.count(CategoryHistory, { category: categoryID })
    return { items, count }
  }

  async setFields(
    category: Category,
    input: Partial<CreateCategoryInput & UpdateCategoryInput>,
    change?: Change,
  ) {
    if (input.name) {
      category.name = this.i18n.addTrReq(category.name, input.name, input.lang)
    }
    if (input.nameTr) {
      category.name = this.i18n.addTrReq(category.name, input.nameTr, input.lang)
    }
    if (input.descShort) {
      category.descShort = this.i18n.addTr(category.descShort, input.descShort, input.lang)
    }
    if (input.descShortTr) {
      category.descShort = this.i18n.addTr(category.descShort, input.descShortTr, input.lang)
    }
    if (input.desc) {
      category.desc = this.i18n.addTr(category.desc, input.desc, input.lang)
    }
    if (input.descTr) {
      category.desc = this.i18n.addTr(category.desc, input.descTr, input.lang)
    }
    if (input.imageURL) {
      category.imageURL = input.imageURL
    }
  }
}
