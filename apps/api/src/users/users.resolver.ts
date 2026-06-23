import { Args, ID, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql'

import { AuthUser, type ReqUser } from '@src/auth/auth.guard'
import { OptionalAuth } from '@src/auth/decorators'
import { Change, ChangesConnection } from '@src/changes/change.model'
import { TrackEntityView } from '@src/common/entity-view.decorator'
import { NotFoundErr } from '@src/common/exceptions'
import { TransformService } from '@src/common/transform'
import { Org, OrgsConnection } from '@src/users/org.model'
import { User, UserChangesArgs, UsersOrgsArgs } from '@src/users/users.model'
import { UsersService } from '@src/users/users.service'

@Resolver(() => User)
export class UsersResolver {
  constructor(
    private readonly usersService: UsersService,
    private readonly transform: TransformService,
  ) {}

  @Query(() => User, { name: 'user', nullable: true })
  @OptionalAuth()
  @TrackEntityView('user')
  async user(@Args('id', { type: () => ID }) id: string) {
    const user = await this.usersService.findOneByID(id)
    if (!user) {
      throw NotFoundErr('User not found')
    }
    const result = await this.transform.entityToModel(User, user)
    return result
  }

  @Query(() => User, { name: 'me', nullable: true })
  async me(@AuthUser() authUser: ReqUser) {
    const user = await this.usersService.findOneByID(authUser.id)
    if (!user) {
      throw NotFoundErr('User not found')
    }
    return this.transform.entityToModel(User, user)
  }

  @ResolveField()
  async orgs(@Parent() user: User, @Args() args: UsersOrgsArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(UsersOrgsArgs, args)
    const cursor = await this.usersService.orgs(user.id, filter)
    return this.transform.entityToPaginated(Org, OrgsConnection, cursor, parsedArgs)
  }

  @ResolveField(() => ChangesConnection)
  async changes(@Parent() user: User, @Args() args: UserChangesArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(UserChangesArgs, args)
    const cursor = await this.usersService.changes(user.id, filter)
    return this.transform.entityToPaginated(Change, ChangesConnection, cursor, parsedArgs)
  }
}
