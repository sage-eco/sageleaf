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
import { DeleteOutput, ModelEditSchema } from '@src/graphql/base.model'
import { RelatedArgs } from '@src/search/related.model'
import { SearchIndex } from '@src/search/search.backend'
import { SearchService } from '@src/search/search.service'
import { Org as OrgEntity } from '@src/users/org.entity'
import {
  CreateOrgInput,
  CreateOrgOutput,
  Org,
  OrgHistory,
  OrgHistoryArgs,
  OrgHistoryConnection,
  OrgsArgs,
  OrgsConnection,
  OrgUsersArgs,
  UpdateOrgInput,
  UpdateOrgOutput,
} from '@src/users/org.model'
import { OrgSchemaService } from '@src/users/org.schema'
import { OrgService } from '@src/users/org.service'
import { User, UserConnection } from '@src/users/users.model'

@Resolver(() => Org)
export class OrgResolver {
  constructor(
    private readonly orgService: OrgService,
    private readonly transform: TransformService,
    private readonly orgSchemaService: OrgSchemaService,
    private readonly searchService: SearchService,
  ) {}

  @Query(() => ModelEditSchema, { nullable: true })
  @OptionalAuth()
  async orgSchema(): Promise<ModelEditSchema> {
    return {
      model: 'Org',
      create: {
        schema: this.orgSchemaService.CreateJSONSchema,
        uischema: this.orgSchemaService.CreateUISchema,
      },
      update: {
        schema: this.orgSchemaService.UpdateJSONSchema,
        uischema: this.orgSchemaService.UpdateUISchema,
      },
    }
  }

  @Query(() => OrgsConnection, { name: 'orgs' })
  @OptionalAuth()
  async orgs(@Args() args: OrgsArgs): Promise<OrgsConnection> {
    const [parsedArgs, filter] = await this.transform.paginationArgs(OrgsArgs, args)
    const cursor = await this.orgService.find(filter)
    return this.transform.entityToPaginated(Org, OrgsConnection, cursor, parsedArgs)
  }

  @Query(() => Org, { name: 'org', nullable: true })
  @OptionalAuth()
  @TrackEntityView('org')
  async org(@Args('id', { type: () => ID }) id: string) {
    const org = await this.orgService.findOneByID(id)
    if (!org) {
      throw NotFoundErr('Org not found')
    }
    const result = await this.transform.entityToModel(Org, org)
    return result
  }

  @ResolveField()
  async users(@Parent() org: Org, @Args() args: OrgUsersArgs) {
    const [parsedArgs, filter] = await this.transform.paginationArgs(OrgUsersArgs, args)
    const cursor = await this.orgService.users(org.id, filter)
    return this.transform.entityToPaginated(User, UserConnection, cursor, parsedArgs)
  }

  @ResolveField(() => OrgsConnection)
  async related(@Parent() org: Org, @Args() args: RelatedArgs) {
    const parsedArgs = await this.searchService.parseRelatedArgs(args)
    const cursor = await this.searchService.searchRelated(
      SearchIndex.ORGS,
      org.id,
      parsedArgs.query,
      parsedArgs.limit,
      parsedArgs.offset,
    )
    return this.transform.entitiesToOffsetPaginated(Org, OrgsConnection, cursor, parsedArgs)
  }

  @Mutation(() => CreateOrgOutput, { nullable: true })
  async createOrg(
    @Args('input') input: CreateOrgInput,
    @AuthUser() user: ReqUser,
  ): Promise<CreateOrgOutput> {
    const created = await this.orgService.create(input, user.id)
    const result = await this.transform.entityToModel(Org, created.org)
    if (!created.change) {
      return { org: result }
    }
    const change = await this.transform.entityToModel(Change, created.change)
    return { org: result, change }
  }

  @Mutation(() => UpdateOrgOutput, { nullable: true })
  async updateOrg(
    @Args('input') input: UpdateOrgInput,
    @AuthUser() user: ReqUser,
  ): Promise<UpdateOrgOutput> {
    const updated = await this.orgService.update(input, user.id)
    const result = await this.transform.entityToModel(Org, updated.org)
    if (!updated.change) {
      return { org: result }
    }
    const change = await this.transform.entityToModel(Change, updated.change)
    const currentOrg = updated.currentOrg
      ? await this.transform.entityToModel(Org, updated.currentOrg)
      : undefined
    return { org: result, change, currentOrg }
  }

  @Mutation(() => DeleteOutput, { name: 'deleteOrg', nullable: true })
  async deleteOrg(@Args('input') input: DeleteInput): Promise<DeleteOutput> {
    const deleted = await this.orgService.delete(input)
    if (!deleted) {
      throw NotFoundErr('Org not found')
    }
    return { success: true, id: deleted.id }
  }

  @ResolveField(() => OrgHistoryConnection)
  async history(@Parent() org: Org, @Args() args: OrgHistoryArgs) {
    const [, filter] = await this.transform.paginationArgs(OrgHistoryArgs, args)
    const cursor = await this.orgService.history(org.id, filter)
    const items = await Promise.all(
      cursor.items.map((h) => this.transform.entityToModel(OrgHistory, h)),
    )
    return this.transform.objectsToPaginated(
      OrgHistoryConnection,
      { items, count: cursor.count },
      true,
    )
  }
}

@Resolver(() => OrgHistory)
export class OrgHistoryResolver {
  constructor(
    private readonly transform: TransformService,
    private readonly editService: EditService,
  ) {}

  @ResolveField('user', () => User)
  async user(@Parent() history: OrgHistory) {
    if (history.user instanceof User) {
      return history.user
    }
    if (Reference.isReference(history.user)) {
      history.user = await history.user.loadOrFail()
    }
    return this.transform.entityToModel(User, history.user)
  }

  @ResolveField('original', () => Org, { nullable: true })
  async historyOriginal(@Parent() history: OrgHistory) {
    const original = history.original
    if (!original) {
      return null
    }
    const entity = await this.editService.changePOJOToEntity(OrgEntity, original)
    return this.transform.entityToModel(Org, entity)
  }

  @ResolveField('changes', () => Org, { nullable: true })
  async historyChanges(@Parent() history: OrgHistory) {
    const changes = history.changes
    if (!changes) {
      return null
    }
    const entity = await this.editService.changePOJOToEntity(OrgEntity, changes)
    return this.transform.entityToModel(Org, entity)
  }
}
