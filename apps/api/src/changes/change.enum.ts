import { createUnionType, registerEnumType } from '@nestjs/graphql'

import { ChangeStatus } from '@src/changes/change.entity'
import { Place } from '@src/geo/place.model'
import { Component } from '@src/process/component.model'
import { Material } from '@src/process/material.model'
import { Process } from '@src/process/process.model'
import { Program } from '@src/process/program.model'
import { Category } from '@src/product/category.model'
import { Item } from '@src/product/item.model'
import { Variant } from '@src/product/variant.model'
import { Org } from '@src/users/org.model'

registerEnumType(ChangeStatus, {
  name: 'ChangeStatus',
  description: 'Status of a change',
})

export const EditModel = createUnionType({
  name: 'EditModel',
  types: () =>
    [Place, Org, Component, Material, Process, Program, Category, Item, Variant] as const,
})

export enum EditModelType {
  Place = 'Place',
  Org = 'Org',
  Component = 'Component',
  Material = 'Material',
  Process = 'Process',
  Program = 'Program',
  Category = 'Category',
  Item = 'Item',
  Variant = 'Variant',
}

registerEnumType(EditModelType, {
  name: 'EditModelType',
  description: 'Type of the model being edited',
})

export enum RefModelType {
  Place = 'Place',
  Org = 'Org',
  Component = 'Component',
  Material = 'Material',
  Process = 'Process',
  Program = 'Program',
  Category = 'Category',
  Item = 'Item',
  Variant = 'Variant',
  Tag = 'Tag',
}

registerEnumType(RefModelType, {
  name: 'RefModelType',
  description: 'Type of the referenced model in a relation edit',
})

export enum OpType {
  ADDED = 'ADDED',
  REMOVED = 'REMOVED',
  MODIFIED = 'MODIFIED',
}

registerEnumType(OpType, {
  name: 'OpType',
  description: 'The kind of change an edit made to a referenced entity',
})
