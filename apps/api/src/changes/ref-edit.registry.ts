import { BaseEntity, EntityName } from '@mikro-orm/postgresql'
import { z } from 'zod/v4'

import { EditModelType, RefModelType } from '@src/changes/change.enum'
import { BadRequestErr } from '@src/common/exceptions'
import { Place as PlaceEntity, PlacesTag } from '@src/geo/place.entity'
import { Place as PlaceModel } from '@src/geo/place.model'
import {
  Component as ComponentEntity,
  ComponentsMaterials,
  ComponentsTags,
} from '@src/process/component.entity'
import { Component as ComponentModel } from '@src/process/component.model'
import {
  ComponentIDSchema,
  ComponentMaterialInputSchema,
  ComponentTagsInputSchema,
} from '@src/process/component.schema'
import { Material as MaterialEntity } from '@src/process/material.entity'
import { MaterialIDSchema } from '@src/process/material.model'
import { Process as ProcessEntity } from '@src/process/process.entity'
import { Process as ProcessModel } from '@src/process/process.model'
import { ProcessIDSchema } from '@src/process/process.schema'
import {
  Program as ProgramEntity,
  ProgramsOrgs,
  ProgramsProcesses,
  ProgramsTags,
} from '@src/process/program.entity'
import { Program as ProgramModel } from '@src/process/program.model'
import { ProgramOrgsInputSchema, ProgramTagsInputSchema } from '@src/process/program.schema'
import { Tag as TagEntity } from '@src/process/tag.entity'
import { TagDefinitionIDSchema } from '@src/process/tag.model'
import { Category as CategoryEntity } from '@src/product/category.entity'
import { Category as CategoryModel } from '@src/product/category.model'
import { CategoryIDSchema } from '@src/product/category.schema'
import { Item as ItemEntity, ItemsCategories, ItemsTags } from '@src/product/item.entity'
import { Item as ItemModel } from '@src/product/item.model'
import { ItemIDSchema, ItemTagsInputSchema } from '@src/product/item.schema'
import {
  Variant as VariantEntity,
  VariantsComponents,
  VariantsItems,
  VariantsOrgs,
  VariantsTags,
} from '@src/product/variant.entity'
import { Variant as VariantModel } from '@src/product/variant.model'
import {
  VariantComponentsInputSchema,
  VariantIDSchema,
  VariantTagsInputSchema,
} from '@src/product/variant.schema'
import { Org as OrgEntity } from '@src/users/org.entity'
import { Org as OrgModel } from '@src/users/org.model'
import { OrgIDSchema } from '@src/users/org.schema'

type EditEntity = BaseEntity & { id: string }
type EntityClass<T extends EditEntity = EditEntity> = new () => T
type RefEditModel =
  | CategoryModel
  | ComponentModel
  | ItemModel
  | OrgModel
  | PlaceModel
  | ProcessModel
  | ProgramModel
  | VariantModel
type ModelClass<T extends RefEditModel = RefEditModel> = new () => T

export type RefEditRelationKind = 'pivot' | 'collection'
type RefEditCardinality = 'many' | 'one'

/**
 * Identifies the owning-side definition for inverse-side M:N ref edits.
 *
 * When a ref edit definition operates on the inverse side of a ManyToMany relation
 * (i.e. the `mappedBy` side, which is not tracked in change POJOs), set `owningRef` to
 * delegate pivot mutations to the owning-side entity. This ensures Change Edits are
 * created on the owning entity (where the pivot table rows live) rather than the inverse
 * entity (where changes would be silently ignored during merge).
 */
export type OwningRefKey = {
  model: EditModelType
  refModel: RefModelType
  refField: string
}

export type RefEditDefinition<
  TRoot extends EditEntity = EditEntity,
  TTarget extends EditEntity = EditEntity,
  TPivot extends object = object,
> = {
  model: EditModelType
  refModel: RefModelType
  refField: string
  entity: EntityClass<TRoot>
  outputModel: ModelClass
  targetEntity: EntityClass<TTarget>
  targetIDSchema: z.ZodType<string>
  relationKind: RefEditRelationKind
  relationCollection: string
  cardinality: RefEditCardinality
  populate: string[]
  pivotEntity?: EntityName<TPivot>
  addInputSchema?: z.ZodObject<any>
  /**
   * When set, this definition is on the inverse side of a ManyToMany.
   * `addRef` and `removeRef` will delegate to the owning-side definition identified
   * by these keys, applying pivot mutations on each target entity instead.
   */
  owningRef?: OwningRefKey
}

const VariantComponentAddInputSchema = VariantComponentsInputSchema.omit({ id: true })
const ComponentMaterialAddInputSchema = ComponentMaterialInputSchema.omit({ id: true })
const ProgramOrgAddInputSchema = ProgramOrgsInputSchema.omit({ id: true })
const ItemTagAddInputSchema = ItemTagsInputSchema.omit({ id: true })
const VariantTagAddInputSchema = VariantTagsInputSchema.omit({ id: true })
const ComponentTagAddInputSchema = ComponentTagsInputSchema.omit({ id: true })
const ProgramTagAddInputSchema = ProgramTagsInputSchema.omit({ id: true })

export const REF_EDIT_DEFINITIONS: RefEditDefinition[] = [
  {
    model: EditModelType.Item,
    refModel: RefModelType.Category,
    refField: 'categories',
    entity: ItemEntity,
    outputModel: ItemModel,
    targetEntity: CategoryEntity,
    targetIDSchema: CategoryIDSchema,
    relationKind: 'pivot',
    relationCollection: 'itemCategories',
    cardinality: 'many',
    pivotEntity: ItemsCategories,
    populate: ['itemCategories'],
  },
  {
    model: EditModelType.Item,
    refModel: RefModelType.Variant,
    refField: 'variants',
    entity: ItemEntity,
    outputModel: ItemModel,
    targetEntity: VariantEntity,
    targetIDSchema: VariantIDSchema,
    relationKind: 'collection',
    relationCollection: 'variants',
    cardinality: 'many',
    populate: ['variants'],
    owningRef: {
      model: EditModelType.Variant,
      refModel: RefModelType.Item,
      refField: 'items',
    },
  },
  {
    model: EditModelType.Item,
    refModel: RefModelType.Tag,
    refField: 'tags',
    entity: ItemEntity,
    outputModel: ItemModel,
    targetEntity: TagEntity,
    targetIDSchema: TagDefinitionIDSchema,
    relationKind: 'pivot',
    relationCollection: 'itemTags',
    cardinality: 'many',
    pivotEntity: ItemsTags,
    populate: ['itemTags'],
    addInputSchema: ItemTagAddInputSchema,
  },
  {
    model: EditModelType.Category,
    refModel: RefModelType.Item,
    refField: 'items',
    entity: CategoryEntity,
    outputModel: CategoryModel,
    targetEntity: ItemEntity,
    targetIDSchema: ItemIDSchema,
    relationKind: 'collection',
    relationCollection: 'items',
    cardinality: 'many',
    populate: ['items'],
    owningRef: {
      model: EditModelType.Item,
      refModel: RefModelType.Category,
      refField: 'categories',
    },
  },
  {
    model: EditModelType.Variant,
    refModel: RefModelType.Item,
    refField: 'items',
    entity: VariantEntity,
    outputModel: VariantModel,
    targetEntity: ItemEntity,
    targetIDSchema: ItemIDSchema,
    relationKind: 'pivot',
    relationCollection: 'variantItems',
    cardinality: 'many',
    pivotEntity: VariantsItems,
    populate: ['variantItems'],
  },
  {
    model: EditModelType.Variant,
    refModel: RefModelType.Org,
    refField: 'orgs',
    entity: VariantEntity,
    outputModel: VariantModel,
    targetEntity: OrgEntity,
    targetIDSchema: OrgIDSchema,
    relationKind: 'pivot',
    relationCollection: 'variantOrgs',
    cardinality: 'many',
    pivotEntity: VariantsOrgs,
    populate: ['variantOrgs'],
  },
  {
    model: EditModelType.Variant,
    refModel: RefModelType.Component,
    refField: 'components',
    entity: VariantEntity,
    outputModel: VariantModel,
    targetEntity: ComponentEntity,
    targetIDSchema: ComponentIDSchema,
    relationKind: 'pivot',
    relationCollection: 'variantComponents',
    cardinality: 'many',
    pivotEntity: VariantsComponents,
    populate: ['variantComponents'],
    addInputSchema: VariantComponentAddInputSchema,
  },
  {
    model: EditModelType.Variant,
    refModel: RefModelType.Tag,
    refField: 'tags',
    entity: VariantEntity,
    outputModel: VariantModel,
    targetEntity: TagEntity,
    targetIDSchema: TagDefinitionIDSchema,
    relationKind: 'pivot',
    relationCollection: 'variantTags',
    cardinality: 'many',
    pivotEntity: VariantsTags,
    populate: ['variantTags'],
    addInputSchema: VariantTagAddInputSchema,
  },
  {
    model: EditModelType.Component,
    refModel: RefModelType.Material,
    refField: 'materials',
    entity: ComponentEntity,
    outputModel: ComponentModel,
    targetEntity: MaterialEntity,
    targetIDSchema: MaterialIDSchema,
    relationKind: 'pivot',
    relationCollection: 'componentMaterials',
    cardinality: 'many',
    pivotEntity: ComponentsMaterials,
    populate: ['componentMaterials'],
    addInputSchema: ComponentMaterialAddInputSchema,
  },
  {
    model: EditModelType.Component,
    refModel: RefModelType.Tag,
    refField: 'tags',
    entity: ComponentEntity,
    outputModel: ComponentModel,
    targetEntity: TagEntity,
    targetIDSchema: TagDefinitionIDSchema,
    relationKind: 'pivot',
    relationCollection: 'componentTags',
    cardinality: 'many',
    pivotEntity: ComponentsTags,
    populate: ['componentTags'],
    addInputSchema: ComponentTagAddInputSchema,
  },
  {
    model: EditModelType.Program,
    refModel: RefModelType.Org,
    refField: 'orgs',
    entity: ProgramEntity,
    outputModel: ProgramModel,
    targetEntity: OrgEntity,
    targetIDSchema: OrgIDSchema,
    relationKind: 'pivot',
    relationCollection: 'programOrgs',
    cardinality: 'many',
    pivotEntity: ProgramsOrgs,
    populate: ['programOrgs'],
    addInputSchema: ProgramOrgAddInputSchema,
  },
  {
    model: EditModelType.Program,
    refModel: RefModelType.Process,
    refField: 'processes',
    entity: ProgramEntity,
    outputModel: ProgramModel,
    targetEntity: ProcessEntity,
    targetIDSchema: ProcessIDSchema,
    relationKind: 'pivot',
    relationCollection: 'programProcesses',
    cardinality: 'many',
    pivotEntity: ProgramsProcesses,
    populate: ['programProcesses'],
  },
  {
    model: EditModelType.Program,
    refModel: RefModelType.Tag,
    refField: 'tags',
    entity: ProgramEntity,
    outputModel: ProgramModel,
    targetEntity: TagEntity,
    targetIDSchema: TagDefinitionIDSchema,
    relationKind: 'pivot',
    relationCollection: 'programTags',
    cardinality: 'many',
    pivotEntity: ProgramsTags,
    populate: ['programTags'],
    addInputSchema: ProgramTagAddInputSchema,
  },
  {
    model: EditModelType.Place,
    refModel: RefModelType.Tag,
    refField: 'tags',
    entity: PlaceEntity,
    outputModel: PlaceModel,
    targetEntity: TagEntity,
    targetIDSchema: TagDefinitionIDSchema,
    relationKind: 'pivot',
    relationCollection: 'place_tags',
    cardinality: 'many',
    pivotEntity: PlacesTag,
    populate: ['place_tags'],
  },
]

export function resolveRefEditDefinition(
  model: EditModelType,
  refModel: RefModelType,
  refField?: string,
): RefEditDefinition {
  const pairMatches = REF_EDIT_DEFINITIONS.filter(
    (definition) => definition.model === model && definition.refModel === refModel,
  )

  if (pairMatches.length === 0) {
    throw BadRequestErr(`Unsupported reference from ${model} to ${refModel}`)
  }

  if (!refField) {
    if (pairMatches.length === 1) {
      return pairMatches[0]
    }
    throw BadRequestErr(
      `Reference from ${model} to ${refModel} is ambiguous. Specify refField: ${pairMatches
        .map((definition) => definition.refField)
        .join(', ')}`,
    )
  }

  const fieldMatch = pairMatches.find((definition) => definition.refField === refField)
  if (!fieldMatch) {
    throw BadRequestErr(`Unsupported reference field ${refField} from ${model} to ${refModel}`)
  }
  return fieldMatch
}

export function isPluralRefEditDefinition(definition: RefEditDefinition): boolean {
  return definition.cardinality === 'many'
}
