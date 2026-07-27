import type { ApolloServer, BaseContext } from '@apollo/server'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'
import { ApolloDriver } from '@nestjs/apollo'
import { Controller, Delete, Get, OnModuleInit, Post, Req, Res, UseGuards } from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import { AbstractGraphQLDriver, GraphQLSchemaHost } from '@nestjs/graphql'
import type { Request, Response } from 'express'
import type { GraphQLSchema } from 'graphql'

import { AuthUser } from '@src/auth/auth.guard'
import type { ReqUser } from '@src/auth/auth.guard'
import { ChangeSchemaService } from '@src/changes/change.schema'
import { ChangeService } from '@src/changes/change.service'
import { RefEditService } from '@src/changes/ref-edit.service'
import { TransformService } from '@src/common/transform'
import { PlaceSchemaService } from '@src/geo/place.schema'
import { PlaceService } from '@src/geo/place.service'
import { McpRateLimitGuard } from '@src/mcp/mcp-rate-limit.guard'
import { buildMcpServer } from '@src/mcp/mcp-tools.registry'
import { McpToolContext } from '@src/mcp/mcp.types'
import { ComponentSchemaService } from '@src/process/component.schema'
import { ComponentService } from '@src/process/component.service'
import { ProcessSchemaService } from '@src/process/process.schema'
import { ProcessService } from '@src/process/process.service'
import { ProgramSchemaService } from '@src/process/program.schema'
import { ProgramService } from '@src/process/program.service'
import { CategorySchemaService } from '@src/product/category.schema'
import { CategoryService } from '@src/product/category.service'
import { ItemSchemaService } from '@src/product/item.schema'
import { ItemService } from '@src/product/item.service'
import { VariantSchemaService } from '@src/product/variant.schema'
import { VariantService } from '@src/product/variant.service'
import { SearchService } from '@src/search/search.service'
import { OrgSchemaService } from '@src/users/org.schema'
import { OrgService } from '@src/users/org.service'

const JSON_RPC_METHOD_NOT_ALLOWED = {
  jsonrpc: '2.0',
  error: { code: -32000, message: 'Method not allowed.' },
  id: null,
}

@Controller('mcp')
@UseGuards(McpRateLimitGuard)
export class McpController implements OnModuleInit {
  /**
   * Resolved once in onModuleInit via ModuleRef's non-strict lookup - neither AbstractGraphQLDriver
   * nor GraphQLSchemaHost is exported by @nestjs/graphql's own module, and McpModule doesn't import
   * it (importing GraphQLModule.register() a second time would build a second ApolloDriver/schema
   * and crash schema generation), so normal constructor DI can't reach them. ModuleRef.get(_, {
   * strict: false }) is Nest's documented escape hatch for reaching another module's internal
   * provider regardless of what the current module imports.
   *
   * apolloServer matters specifically because graphql_query calls apolloServer.executeOperation()
   * rather than calling graphql-js's execute() directly against the schema - that runs the query
   * through the exact same plugin pipeline a real /graphql request does (RateLimitPlugin's
   * complexity-based rate limiting, ApolloServerPluginResponseCache, formatError), instead of
   * silently skipping all of that.
   */
  private apolloServer!: ApolloServer<BaseContext>
  private schema!: GraphQLSchema

  constructor(
    private readonly moduleRef: ModuleRef,
    private readonly transform: TransformService,
    private readonly changeService: ChangeService,
    private readonly changeSchemaService: ChangeSchemaService,
    private readonly refEditService: RefEditService,
    private readonly searchService: SearchService,
    private readonly itemService: ItemService,
    private readonly itemSchemaService: ItemSchemaService,
    private readonly processService: ProcessService,
    private readonly processSchemaService: ProcessSchemaService,
    private readonly variantService: VariantService,
    private readonly variantSchemaService: VariantSchemaService,
    private readonly categoryService: CategoryService,
    private readonly categorySchemaService: CategorySchemaService,
    private readonly placeService: PlaceService,
    private readonly placeSchemaService: PlaceSchemaService,
    private readonly orgService: OrgService,
    private readonly orgSchemaService: OrgSchemaService,
    private readonly componentService: ComponentService,
    private readonly componentSchemaService: ComponentSchemaService,
    private readonly programService: ProgramService,
    private readonly programSchemaService: ProgramSchemaService,
  ) {}

  onModuleInit() {
    const driver = this.moduleRef.get(AbstractGraphQLDriver, { strict: false }) as ApolloDriver
    this.apolloServer = driver.instance
    this.schema = this.moduleRef.get(GraphQLSchemaHost, { strict: false }).schema
  }

  @Post()
  async handlePost(@Req() req: Request, @Res() res: Response, @AuthUser() user: ReqUser | null) {
    if (!user) {
      res.status(401).json({
        jsonrpc: '2.0',
        error: { code: -32001, message: 'Unauthorized' },
        id: null,
      })
      return
    }

    const ctx: McpToolContext = {
      userID: user.id,
      reqUser: user,
      rawReq: req,
      schema: this.schema,
      apolloServer: this.apolloServer,
      transform: this.transform,
      changeService: this.changeService,
      changeSchemaService: this.changeSchemaService,
      refEditService: this.refEditService,
      searchService: this.searchService,
      itemService: this.itemService,
      itemSchemaService: this.itemSchemaService,
      processService: this.processService,
      processSchemaService: this.processSchemaService,
      variantService: this.variantService,
      variantSchemaService: this.variantSchemaService,
      categoryService: this.categoryService,
      categorySchemaService: this.categorySchemaService,
      placeService: this.placeService,
      placeSchemaService: this.placeSchemaService,
      orgService: this.orgService,
      orgSchemaService: this.orgSchemaService,
      componentService: this.componentService,
      componentSchemaService: this.componentSchemaService,
      programService: this.programService,
      programSchemaService: this.programSchemaService,
    }

    const server = buildMcpServer(ctx)
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    res.on('close', () => {
      transport.close()
      server.close()
    })

    try {
      await server.connect(transport)
      await transport.handleRequest(req, res, req.body)
    } catch {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        })
      }
    }
  }

  @Get()
  handleGet(@Res() res: Response) {
    res
      .writeHead(405, { 'Content-Type': 'application/json' })
      .end(JSON.stringify(JSON_RPC_METHOD_NOT_ALLOWED))
  }

  @Delete()
  handleDelete(@Res() res: Response) {
    res
      .writeHead(405, { 'Content-Type': 'application/json' })
      .end(JSON.stringify(JSON_RPC_METHOD_NOT_ALLOWED))
  }
}
