import {
  BaseEntity,
  Collection,
  Entity,
  Index,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OptionalProps,
  PrimaryKey,
  PrimaryKeyProp,
  Property,
} from '@mikro-orm/core'
import type { Ref } from '@mikro-orm/core'
import { z } from 'zod/v4'

import { Source } from '@src/changes/source.entity'
import { ExcludeFromDiff } from '@src/common/exclude-from-diff.decorator'
import type { TranslatedField } from '@src/common/i18n'
import { type Rank, RANK_ORDER_SQL } from '@src/common/z.schema'
import { IDCreatedUpdated } from '@src/db/base.entity'
import { Place } from '@src/geo/place.entity'
import { Region } from '@src/geo/region.entity'
import { Material } from '@src/process/material.entity'
import { Program } from '@src/process/program.entity'
import { Variant } from '@src/product/variant.entity'
import { Org } from '@src/users/org.entity'
import { User } from '@src/users/users.entity'

export enum ProcessIntent {
  // Reuse a functional product.
  REUSE = 'REUSE',
  // Repair a product to extend its life.
  REPAIR = 'REPAIR',
  // Refurbish old products to like-new status.
  REFURBISH = 'REFURBISH',
  // Use components in new products with the same function.
  REMANUFACTURE = 'REMANUFACTURE',
  // Use components in new products with different functions.
  REPURPOSE = 'REPURPOSE',
  // Reduce resource consumption or waste generation.
  REDUCE = 'REDUCE',
  // Recycle components into raw materials.
  RECYCLE = 'RECYCLE',
  // Energy recovery typically through incineration.
  ENERGY_RECOVERY = 'ENERGY_RECOVERY',
  // Disposal with no future use.
  LANDFILL = 'LANDFILL',
  // Improperly disposed components.
  LITTER = 'LITTER',
}

export const ProcessInstructionsContainerTypeSchema = z.enum([
  'BOX',
  'BAG',
  'BIN',
  'SMART_BOX',
  'DEPOSIT_RETURN',
  'OTHER',
  'UNKNOWN',
])

export enum ProcessInstructionsContainerType {
  // Container that is enclosed with a rigid body
  BOX = 'BOX',
  // Container with a flexible body
  BAG = 'BAG',
  // Container that is always open to the air
  BIN = 'BIN',
  // Powered container that is enclosed with a rigid body
  SMART_BOX = 'SMART_BOX',
  // Machine that gives a monetary reward per item
  DEPOSIT_RETURN = 'DEPOSIT_RETURN',
  // Container that doesn't fit into any of the above
  OTHER = 'OTHER',
  UNKNOWN = 'UNKNOWN',
}

export const ProcessInstructionsAccessSchema = z.enum(['PUBLIC', 'PRIVATE', 'RESTRICTED'])

export enum ProcessInstructionsAccess {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE',
  // Restricted means the container may be accessible
  // to the public, but with additional restrictions.
  RESTRICTED = 'RESTRICTED',
}

export const ProcessInstructionsSchema = z
  .object({
    container: z
      .object({
        type: ProcessInstructionsContainerTypeSchema,
        access: ProcessInstructionsAccessSchema.optional(),
        image: z.url().optional(),
        color: z.string().optional(),
        shape: z
          .object({
            height: z.number().optional(),
            width: z.number().optional(),
            depth: z.number().optional(),
          })
          .optional(),
        imageEntryPoint: z
          .object({
            x: z.int().min(-100).max(200),
            y: z.int().min(-100).max(200),
            side: z.enum(['left', 'right', 'top', 'bottom']),
          })
          .optional(),
      })
      .optional(),
    collection: z
      .object({
        rrule: z.string().optional(),
      })
      .optional(),
  })
  .default({})

export interface ProcessInstructions {
  // Description of the container to deposit
  // an item for collection.
  container?: {
    type: ProcessInstructionsContainerType
    access?: ProcessInstructionsAccess
    image?: string
    color?: string
    shape?: {
      height?: number
      width?: number
      depth?: number
    }
    imageEntryPoint?: {
      // The entry point is the relative position where items are placed in the container.
      // x and y are percentages (0-100) relative to the top left corner of the image.
      // The percentages can be less than 0 or greater than 100, if the image should be
      // outside the container image.
      // The side indicates how to display any item being placed in the container.
      x: number
      y: number
      side: 'left' | 'right' | 'top' | 'bottom'
    }
  }
  // How often items are collected.
  collection?: {
    // iCalendar RRULE string
    rrule?: string
  }
}

export const MatchRuleSchema = z.object({
  // A process rule is given as input:
  // One component, zero or more component tags, and one or more materials.
  // These rules are used to match properties of any of these inputs.
  // Check if this component tag is present.
  componentTag: z.string().optional(),
  // Run a JSON schema against the meta object.
  componentTagMeta: z.string().optional(),
  // Check if this material is present.
  material: z.string().optional(),
})

export const ProcessRulesSchema = z
  .object({
    match: z
      .array(z.union([MatchRuleSchema, z.object({ or: z.array(MatchRuleSchema) })]))
      .optional(),
  })
  .optional()

export type ProcessRules = z.infer<typeof ProcessRulesSchema>

export interface ProcessEfficiency {
  // How much of the input is converted to useful output.
  // This is a number between 0 and 1.
  // For example, if 100kg of plastic is recycled into
  // 80kg of new plastic, the efficiency is 0.8.
  // This is usually a computed estimate.
  // The value is between 0 and 1, where 1 means
  // all input is converted to useful output.
  efficiency?: number
  // How much of the input is converted to output that
  // is used for the same purpose as the input.
  // The value is between 0 and 1, where 1 means
  // all input is converted to output that is used for
  // the same purpose as the input.
  equivalency?: number
  // What is the ration of the value of the output
  // compared to the value of the input.
  // This generally means monetary value.
  // The value cannot be less than 0, but possibly
  // greater than 1, meaning the output is more valuable
  // than the input.
  valueRatio?: number
}

export const ProcessEfficiencySchema = z.object({
  efficiency: z.number().min(0).max(1).optional(),
  equivalency: z.number().min(0).max(1).optional(),
  valueRatio: z.number().min(0).optional(),
})

@Entity({ tableName: 'processes', schema: 'public' })
@Index({
  name: 'processes_rank_order_idx',
  expression: `create index "processes_rank_order_idx" on "processes" (rank_order desc, id desc)`,
})
export class Process extends IDCreatedUpdated {
  [OptionalProps]?: 'rankOrder'

  @Property({ type: 'text' })
  intent!: ProcessIntent

  @Property({ type: 'json' })
  name!: TranslatedField

  @Property({ type: 'json' })
  desc?: TranslatedField

  // Each process must specify a material type
  // OR a variant. The former means it accepts
  // anything with that material, the latter means
  // there is a specific recycle/refurbish/etc process
  // for that variant.
  @ManyToOne()
  material?: Ref<Material>

  @ManyToOne()
  variant?: Ref<Variant>

  // How the process is utilized.
  @Property({ type: 'json' })
  instructions!: ProcessInstructions

  // Description of the process efficiency,
  // measuring how much of the input is
  // converted to useful output.
  @Property({ type: 'json' })
  efficiency?: ProcessEfficiency

  // Rules for matching materials/variants to this process.
  @Property({ type: 'json' })
  rules?: ProcessRules

  @ExcludeFromDiff()
  @Property({ type: 'json' })
  rank?: Rank

  @ExcludeFromDiff()
  @Property({ type: 'double precision', generated: `(${RANK_ORDER_SQL}) stored`, nullable: false })
  rankOrder!: number

  @ManyToMany({ entity: () => Source, pivotEntity: () => ProcessSources })
  sources = new Collection<Source>(this)

  @OneToMany(() => ProcessSources, (pr) => pr.process)
  processSources = new Collection<ProcessSources>(this)

  @ManyToMany({ entity: () => Program, mappedBy: 'processes' })
  programs = new Collection<Program>(this)

  @ManyToOne()
  org?: Ref<Org>

  @ManyToOne()
  region?: Ref<Region>

  @ManyToOne()
  place?: Ref<Place>

  @OneToMany({ mappedBy: 'process' })
  history = new Collection<ProcessHistory>(this)
}

@Entity({ tableName: 'process_sources', schema: 'public' })
export class ProcessSources extends BaseEntity {
  @ManyToOne({ primary: true })
  process!: Process

  @ManyToOne({ primary: true })
  source!: Source & {}

  // Metadata contains key value pairs for the connected
  // source. For example: There is a single source for an API, but
  // here the metadata contains an important string provided by that API.
  // This can be used to format links directly to the source.
  // If we just need external IDs, we use the ExternalSource entity.
  @Property({ type: 'json' })
  meta?: Record<string, any>
}

@Entity({ tableName: 'process_history', schema: 'public' })
export class ProcessHistory extends BaseEntity {
  @ManyToOne({ primary: true })
  process!: Process

  @PrimaryKey()
  datetime!: Date;

  [PrimaryKeyProp]?: ['process', 'datetime']

  @ManyToOne()
  user!: Ref<User>

  @Property({ type: 'json' })
  original?: Record<string, any>

  @Property({ type: 'json' })
  changes?: Record<string, any>
}
