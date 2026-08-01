import { Reference } from '@mikro-orm/core'
import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { AuthUser, type ReqUser } from '@src/auth/auth.guard'
import { OptionalAuth } from '@src/auth/decorators'
import { DeleteInput } from '@src/changes/change-ext.model'
import { Change } from '@src/changes/change.model'
import { EditService } from '@src/changes/edit.service'
import { TrackEntityView } from '@src/common/entity-view.decorator'
import { NotFoundErr } from '@src/common/exceptions'
import { TransformService } from '@src/common/transform'
import { Place } from '@src/geo/place.model'
import { PlaceService } from '@src/geo/place.service'
import { Region } from '@src/geo/region.model'
import { RegionService } from '@src/geo/region.service'
import { DeleteOutput, ModelEditSchema } from '@src/graphql/base.model'
import { Material } from '@src/process/material.model'
import { MaterialService } from '@src/process/material.service'
import { Process as ProcessEntity } from '@src/process/process.entity'
import {
  CreateProcessInput,
  CreateProcessOutput,
  Process,
  ProcessArgs,
  ProcessConnection,
  ProcessHistory,
  ProcessHistoryArgs,
  ProcessHistoryConnection,
  ProcessSource,
  ProcessSourcesArgs,
  ProcessSourcesConnection,
  UpdateProcessInput,
  UpdateProcessOutput,
} from '@src/process/process.model'
import { ProcessSchemaService } from '@src/process/process.schema'
import { ProcessService } from '@src/process/process.service'
import { Variant } from '@src/product/variant.model'
import { VariantService } from '@src/product/variant.service'
import { Org } from '@src/users/org.model'
import { OrgService } from '@src/users/org.service'
import { User } from '@src/users/users.model'

@Resolver(() => Process)
export class ProcessResolver {
  constructor(
    private readonly processService: ProcessService,
    private readonly transform: TransformService,
    private readonly processSchemaService: ProcessSchemaService,
    private readonly materialService: MaterialService,
    private readonly variantService: VariantService,
    private readonly orgService: OrgService,
    private readonly regionService: RegionService,
    private readonly placeService: PlaceService,
  ) {}

  @Query(() => ProcessConnection, { name: 'processes' })
  @OptionalAuth()
  async processes(@Args() args: ProcessArgs): Promise<ProcessConnection> {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ProcessArgs, args)
    if (args.region) filter.where.region = args.region
    if (args.material) filter.where.material = args.material

    const cursor = await this.processService.find(filter)
    return this.transform.entityToPaginated(Process, ProcessConnection, cursor, parsedArgs)
  }

  @Query(() => Process, { name: 'process', nullable: true })
  @OptionalAuth()
  @TrackEntityView('process')
  async process(@Args('id', { type: () => ID }) id: string): Promise<Process> {
    const process = await this.processService.findOneByID(id)
    if (!process) {
      throw NotFoundErr('Process not found')
    }
    return this.transform.entityToModel(Process, process)
  }

  @Query(() => ModelEditSchema, { nullable: true })
  @OptionalAuth()
  async processSchema(): Promise<ModelEditSchema> {
    return {
      model: 'Process',
      create: {
        schema: this.processSchemaService.CreateJSONSchema,
        uischema: this.processSchemaService.CreateUISchema,
      },
      update: {
        schema: this.processSchemaService.UpdateJSONSchema,
        uischema: this.processSchemaService.UpdateUISchema,
      },
    }
  }

  @Mutation(() => CreateProcessOutput, {
    name: 'createProcess',
    nullable: true,
  })
  async createProcess(
    @Args('input') input: CreateProcessInput,
    @AuthUser() user: ReqUser,
  ): Promise<CreateProcessOutput> {
    input = await this.processSchemaService.parseCreateInput(input)
    const created = await this.processService.create(input, user.id)
    const model = await this.transform.entityToModel(Process, created.process)
    if (created.change) {
      const change = await this.transform.entityToModel(Change, created.change)
      return { process: model, change }
    }
    return { process: model }
  }

  @Mutation(() => UpdateProcessOutput, {
    name: 'updateProcess',
    nullable: true,
  })
  async updateProcess(
    @Args('input') input: UpdateProcessInput,
    @AuthUser() user: ReqUser,
  ): Promise<UpdateProcessOutput> {
    input = await this.processSchemaService.parseUpdateInput(input)
    const updated = await this.processService.update(input, user.id)
    const model = await this.transform.entityToModel(Process, updated.process)
    if (updated.change) {
      const change = await this.transform.entityToModel(Change, updated.change)
      const currentProcess = updated.currentProcess
        ? await this.transform.entityToModel(Process, updated.currentProcess)
        : undefined
      return { process: model, change, currentProcess }
    }
    return { process: model }
  }

  @Mutation(() => DeleteOutput, { name: 'deleteProcess', nullable: true })
  async deleteProcess(@Args('input') input: DeleteInput): Promise<DeleteOutput> {
    input = await this.processSchemaService.parseDeleteInput(input)
    const process = await this.processService.delete(input)
    return { success: true, id: process.id }
  }

  @ResolveField(() => Material, { nullable: true })
  async material(@Parent() process: Process) {
    if (!process.material?.id) return null
    const entity = await this.materialService.findOneByID(process.material.id)
    return entity ? this.transform.entityToModel(Material, entity) : null
  }

  @ResolveField(() => Variant, { nullable: true })
  async variant(@Parent() process: Process) {
    if (!process.variant?.id) return null
    const entity = await this.variantService.findOneByID(process.variant.id)
    return entity ? this.transform.entityToModel(Variant, entity) : null
  }

  @ResolveField(() => Org, { nullable: true })
  async org(@Parent() process: Process) {
    if (!process.org?.id) return null
    const entity = await this.orgService.findOneByID(process.org.id)
    return entity ? this.transform.entityToModel(Org, entity) : null
  }

  @ResolveField(() => Region, { nullable: true })
  async region(@Parent() process: Process) {
    if (!process.region?.id) return null
    const entity = await this.regionService.findOneByID(process.region.id)
    return entity ? this.transform.entityToModel(Region, entity) : null
  }

  @ResolveField(() => Place, { nullable: true })
  async place(@Parent() process: Process) {
    if (!process.place?.id) return null
    const entity = await this.placeService.findOneByID(process.place.id)
    return entity ? this.transform.entityToModel(Place, entity) : null
  }

  @ResolveField(() => ProcessSourcesConnection)
  async sources(@Parent() process: Process, @Args() args: ProcessSourcesArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ProcessSourcesArgs, args)
    const cursor = await this.processService.sources(process.id, filter)
    return this.transform.entityToPaginated(
      ProcessSource,
      ProcessSourcesConnection,
      cursor,
      parsedArgs,
    )
  }

  @ResolveField(() => ProcessHistoryConnection)
  async history(@Parent() process: Process, @Args() args: ProcessHistoryArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ProcessHistoryArgs, args)
    const cursor = await this.processService.history(process.id, filter)
    const items = await Promise.all(
      cursor.items.map((h) => this.transform.entityToModel(ProcessHistory, h)),
    )
    return this.transform.objectsToPaginated(
      ProcessHistoryConnection,
      { items, count: cursor.count },
      true,
      parsedArgs,
      (node: any) => node.datetime?.toISO?.() ?? '',
    )
  }
}

@Resolver(() => ProcessHistory)
export class ProcessHistoryResolver {
  constructor(
    private readonly transform: TransformService,
    private readonly editService: EditService,
  ) {}

  @ResolveField('user', () => User)
  async user(@Parent() history: ProcessHistory) {
    if (history.user instanceof User) {
      return history.user
    }
    if (Reference.isReference(history.user)) {
      history.user = await history.user.loadOrFail()
    }
    return this.transform.entityToModel(User, history.user)
  }

  @ResolveField('original', () => Process, { nullable: true })
  async historyOriginal(@Parent() history: ProcessHistory) {
    const original = history.original
    if (!original) {
      return null
    }
    const entity = await this.editService.changePOJOToEntity(ProcessEntity, original)
    return this.transform.entityToModel(Process, entity)
  }

  @ResolveField('changes', () => Process, { nullable: true })
  async historyChanges(@Parent() history: ProcessHistory) {
    const changes = history.changes
    if (!changes) {
      return null
    }
    const entity = await this.editService.changePOJOToEntity(ProcessEntity, changes)
    return this.transform.entityToModel(Process, entity)
  }
}
