import { Args, Parent, ResolveField, Resolver } from '@nestjs/graphql'

import { TransformService } from '@src/common/transform'
import {
  RecyclingStream,
  ReduceStream,
  ReuseStream,
  StreamProgramsArgs,
  StreamProgramsConnection,
} from '@src/process/stream.model'
import { StreamService } from '@src/process/stream.service'

@Resolver(() => RecyclingStream)
export class RecyclingStreamResolver {
  constructor(
    private readonly streamService: StreamService,
    private readonly transform: TransformService,
  ) {}

  @ResolveField(() => StreamProgramsConnection)
  async programs(
    @Parent() stream: RecyclingStream,
    @Args() args: StreamProgramsArgs,
  ): Promise<StreamProgramsConnection> {
    const cursor = await this.streamService.findProgramsForProcess(stream.processId, args)
    return this.transform.objectsToPaginated(StreamProgramsConnection, cursor, true)
  }
}

@Resolver(() => ReduceStream)
export class ReduceStreamResolver {
  constructor(
    private readonly streamService: StreamService,
    private readonly transform: TransformService,
  ) {}

  @ResolveField(() => StreamProgramsConnection)
  async programs(
    @Parent() stream: ReduceStream,
    @Args() args: StreamProgramsArgs,
  ): Promise<StreamProgramsConnection> {
    const cursor = await this.streamService.findProgramsForProcess(stream.processId, args)
    return this.transform.objectsToPaginated(StreamProgramsConnection, cursor, true)
  }
}

@Resolver(() => ReuseStream)
export class ReuseStreamResolver {
  constructor(
    private readonly streamService: StreamService,
    private readonly transform: TransformService,
  ) {}

  @ResolveField(() => StreamProgramsConnection)
  async programs(
    @Parent() stream: ReuseStream,
    @Args() args: StreamProgramsArgs,
  ): Promise<StreamProgramsConnection> {
    const cursor = await this.streamService.findProgramsForProcess(stream.processId, args)
    return this.transform.objectsToPaginated(StreamProgramsConnection, cursor, true)
  }
}
