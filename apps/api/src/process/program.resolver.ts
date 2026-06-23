import { Args, ID, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { AuthUser, type ReqUser } from '@src/auth/auth.guard'
import { OptionalAuth } from '@src/auth/decorators'
import { Change } from '@src/changes/change.model'
import { EditService } from '@src/changes/edit.service'
import { TrackEntityView } from '@src/common/entity-view.decorator'
import { NotFoundErr } from '@src/common/exceptions'
import { TransformService } from '@src/common/transform'
import { ModelEditSchema } from '@src/graphql/base.model'
import { Process, ProcessConnection } from '@src/process/process.model'
import {
  CreateProgramInput,
  CreateProgramOutput,
  Program,
  ProgramHistory,
  ProgramHistoryArgs,
  ProgramHistoryConnection,
  ProgramOrgsArgs,
  ProgramProcessesArgs,
  ProgramsArgs,
  ProgramsConnection,
  ProgramTagsArgs,
  UpdateProgramInput,
  UpdateProgramOutput,
} from '@src/process/program.model'
import { ProgramSchemaService } from '@src/process/program.schema'
import { ProgramService } from '@src/process/program.service'
import { Tag, TagConnection } from '@src/process/tag.model'
import { Org, OrgsConnection } from '@src/users/org.model'

@Resolver(() => Program)
export class ProgramResolver {
  constructor(
    private readonly programService: ProgramService,
    private readonly transform: TransformService,
    private readonly programSchemaService: ProgramSchemaService,
    private readonly editService: EditService,
  ) {}

  @Query(() => ProgramsConnection, { name: 'programs' })
  @OptionalAuth()
  async programs(@Args() args: ProgramsArgs): Promise<ProgramsConnection> {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ProgramsArgs, args)
    const cursor = await this.programService.find(filter)
    return this.transform.entityToPaginated(Program, ProgramsConnection, cursor, parsedArgs)
  }

  @Query(() => Program, { name: 'program', nullable: true })
  @OptionalAuth()
  @TrackEntityView('program')
  async program(@Args('id', { type: () => ID }) id: string): Promise<Program> {
    const program = await this.programService.findOneByID(id)
    if (!program) {
      throw NotFoundErr('Program not found')
    }
    const result = await this.transform.entityToModel(Program, program)
    return result
  }

  @Query(() => ModelEditSchema, { nullable: true })
  @OptionalAuth()
  async programSchema(): Promise<ModelEditSchema> {
    return {
      model: 'Program',
      create: {
        schema: this.programSchemaService.CreateJSONSchema,
        uischema: this.programSchemaService.CreateUISchema,
      },
      update: {
        schema: this.programSchemaService.UpdateJSONSchema,
        uischema: this.programSchemaService.UpdateUISchema,
      },
    }
  }

  @ResolveField()
  async orgs(@Parent() program: Program, @Args() args: ProgramOrgsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ProgramOrgsArgs, args)
    const cursor = await this.programService.orgs(program.id, filter)
    return this.transform.entityToPaginated(Org, OrgsConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async processes(@Parent() program: Program, @Args() args: ProgramProcessesArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ProgramProcessesArgs, args)
    const cursor = await this.programService.processes(program.id, filter)
    return this.transform.entityToPaginated(Process, ProcessConnection, cursor, parsedArgs)
  }

  @ResolveField()
  async tags(@Parent() program: Program, @Args() args: ProgramTagsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(ProgramTagsArgs, args)
    const cursor = await this.programService.tags(program.id, filter)
    return this.transform.entityToPaginated(Tag, TagConnection, cursor, parsedArgs)
  }

  @ResolveField(() => ProgramHistoryConnection)
  async history(@Parent() program: Program, @Args() args: ProgramHistoryArgs) {
    const [, filter] = await this.transform.paginationArgs(ProgramHistoryArgs, args)
    const cursor = await this.programService.history(program.id, filter)
    const items = await Promise.all(
      cursor.items.map((h: any) => this.transform.entityToModel(ProgramHistory, h)),
    )
    return this.transform.objectsToPaginated(
      ProgramHistoryConnection,
      { items, count: cursor.count },
      true,
    )
  }

  @Mutation(() => CreateProgramOutput, { name: 'createProgram', nullable: true })
  async createProgram(
    @Args('input') input: CreateProgramInput,
    @AuthUser() user: ReqUser,
  ): Promise<CreateProgramOutput> {
    input = await this.programSchemaService.parseCreateInput(input)
    const { program, change } = await this.programService.create(input, user.id)
    const model = await this.transform.entityToModel(Program, program)
    return {
      program: model,
      change: change ? await this.transform.entityToModel(Change, change) : undefined,
    }
  }

  @Mutation(() => UpdateProgramOutput, { name: 'updateProgram', nullable: true })
  async updateProgram(
    @Args('input') input: UpdateProgramInput,
    @AuthUser() user: ReqUser,
  ): Promise<UpdateProgramOutput> {
    input = await this.programSchemaService.parseUpdateInput(input)
    const { program, change, currentProgram } = await this.programService.update(input, user.id)
    const model = await this.transform.entityToModel(Program, program)
    const currentModel = currentProgram
      ? await this.transform.entityToModel(Program, currentProgram)
      : undefined
    return {
      program: model,
      currentProgram: currentModel,
      change: change ? await this.transform.entityToModel(Change, change) : undefined,
    }
  }
}
