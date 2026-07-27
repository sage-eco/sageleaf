import { MikroORM } from '@mikro-orm/postgresql'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import { GraphQLTestClient } from '@test/graphql.utils'
import request from 'supertest'

import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'
import { SearchService } from '@src/search/search.service'
import { User } from '@src/users/users.entity'
import { WindmillMockService } from '@src/windmill/windmill.mock.service'
import { WindmillService } from '@src/windmill/windmill.service'

const MCP_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
  'Accept-Language': 'en',
}

// The transport streams SSE by default (no `enableJsonResponse`), so responses arrive as
// `data: {...}` lines rather than a plain JSON body - parse out the JSON-RPC payload.
function parseSSE(body: string): any[] {
  return body
    .split('\n\n')
    .map((chunk) => chunk.split('\n').find((line) => line.startsWith('data: ')))
    .filter((line): line is string => Boolean(line))
    .map((line) => JSON.parse(line.slice('data: '.length)))
}

describe('MCP Server (integration)', () => {
  let app: INestApplication
  let orm: MikroORM
  let adminUser: User
  let authCookie: string

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule],
    })
      .overrideProvider(SearchService)
      .useValue({
        searchAll: async () => null,
      })
      .overrideProvider(WindmillService)
      .useClass(WindmillMockService)
      .compile()

    app = module.createNestApplication()
    await app.init()

    orm = module.get<MikroORM>(MikroORM)

    await clearDatabase(orm, 'auth')
    await clearDatabase(orm, 'public')
    await orm.seeder.seed(BaseSeeder, UserSeeder)

    adminUser = await orm.em.findOneOrFail(User, { username: 'admin' })

    const cookieGql = new GraphQLTestClient(app)
    await cookieGql.signIn('admin', 'password')
    const cookies: string[] = (cookieGql as any).cookies
    authCookie = cookies.map((c) => c.split(';')[0]).join('; ')
  })

  afterAll(async () => {
    await app.close()
  })

  function mcpRequest(body: object) {
    return request(app.getHttpServer())
      .post('/mcp')
      .set(MCP_HEADERS)
      .set('Cookie', authCookie)
      .send(body)
  }

  test('request without auth is rejected with 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/mcp')
      .set(MCP_HEADERS)
      .send({ jsonrpc: '2.0', method: 'tools/list', id: 1 })

    expect(res.status).toBe(401)
  })

  test('GET /mcp is rejected with 405', async () => {
    const res = await request(app.getHttpServer())
      .get('/mcp')
      .set('Cookie', authCookie)
      .set('Accept', 'application/json, text/event-stream')

    expect(res.status).toBe(405)
  })

  test('DELETE /mcp is rejected with 405', async () => {
    const res = await request(app.getHttpServer())
      .delete('/mcp')
      .set('Cookie', authCookie)
      .set('Accept', 'application/json, text/event-stream')

    expect(res.status).toBe(405)
  })

  test('initialize succeeds as an independent stateless request', async () => {
    const res = await mcpRequest({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'test-client', version: '1.0.0' },
      },
      id: 1,
    })

    expect(res.status).toBe(200)
    const [event] = parseSSE(res.text)
    expect(event.result.serverInfo.name).toBe('sage-api')
  })

  test('tools/list succeeds as an independent stateless request (no prior initialize needed)', async () => {
    const res = await mcpRequest({ jsonrpc: '2.0', method: 'tools/list', id: 1 })

    expect(res.status).toBe(200)
    const [event] = parseSSE(res.text)
    const names = event.result.tools.map((t: any) => t.name)
    expect(names).toEqual(
      expect.arrayContaining([
        'whoami',
        'search_catalog',
        'graphql_query',
        'graphql_introspection',
        'begin_change',
        'edit_change',
        'propose_edit',
        'propose_refs',
      ]),
    )
  })

  test('graphql_introspection returns the schema SDL, or a single type on request', async () => {
    const fullRes = await mcpRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'graphql_introspection', arguments: {} },
      id: 1,
    })
    const fullEvent = parseSSE(fullRes.text)[0]
    expect(fullEvent.result.isError).toBeFalsy()
    expect(fullEvent.result.content[0].text).toContain('type Query')

    const typeRes = await mcpRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'graphql_introspection', arguments: { typeName: 'Item' } },
      id: 1,
    })
    const typeEvent = parseSSE(typeRes.text)[0]
    expect(typeEvent.result.isError).toBeFalsy()
    expect(typeEvent.result.content[0].text).toContain('type Item')

    const missingRes = await mcpRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'graphql_introspection', arguments: { typeName: 'NotARealType' } },
      id: 1,
    })
    const missingEvent = parseSSE(missingRes.text)[0]
    expect(missingEvent.result.isError).toBe(true)
  })

  test('graphql_query runs a read query as the authenticated user', async () => {
    const res = await mcpRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'graphql_query', arguments: { query: '{ me { id username } }' } },
      id: 1,
    })

    expect(res.status).toBe(200)
    const event = parseSSE(res.text)[0]
    expect(event.result.isError).toBeFalsy()
    const payload = JSON.parse(event.result.content[0].text)
    expect(payload.data.me.id).toBe(adminUser.id)
    expect(payload.data.me.username).toBe('admin')
  })

  test('graphql_query rejects mutations', async () => {
    const res = await mcpRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'graphql_query',
        arguments: {
          query:
            'mutation { createChange(input: { title: "should be rejected" }) { change { id } } }',
        },
      },
      id: 1,
    })

    const event = parseSSE(res.text)[0]
    expect(event.result.isError).toBe(true)
    expect(event.result.content[0].text).toMatch(/only "query" operations/i)
  })

  test('tools/call whoami returns the authenticated user', async () => {
    const res = await mcpRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'whoami', arguments: {} },
      id: 1,
    })

    expect(res.status).toBe(200)
    const [event] = parseSSE(res.text)
    const payload = JSON.parse(event.result.content[0].text)
    expect(payload.id).toBe(adminUser.id)
  })

  test('search_catalog returns structured content that satisfies its output schema', async () => {
    const res = await mcpRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'search_catalog',
        arguments: { query: 'mcp-integration-test-no-results-expected' },
      },
      id: 1,
    })

    expect(res.status).toBe(200)
    const [event] = parseSSE(res.text)
    expect(event.result.isError).toBeFalsy()
    expect(event.result.structuredContent).toEqual({
      items: [],
      totalCount: 0,
      facets: [],
    })
    expect(JSON.parse(event.result.content[0].text)).toEqual(event.result.structuredContent)
  })

  test('begin_change -> propose_edit -> propose_refs round trip, then status lock', async () => {
    const beginRes = await mcpRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'begin_change', arguments: { title: 'MCP integration test change' } },
      id: 1,
    })
    const beginPayload = JSON.parse(parseSSE(beginRes.text)[0].result.content[0].text)
    const changeID = beginPayload.changeID
    expect(changeID).toBeDefined()
    expect(beginPayload.status).toBe('DRAFT')

    const proposeRes = await mcpRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'propose_edit',
        arguments: {
          model: 'Item',
          mode: 'create',
          changeID,
          data: { name: 'MCP Test Item' },
        },
      },
      id: 1,
    })
    const proposeEvent = parseSSE(proposeRes.text)[0]
    expect(proposeEvent.result.isError).toBeFalsy()
    const proposePayload = JSON.parse(proposeEvent.result.content[0].text)
    expect(proposePayload.entity.name).toBe('MCP Test Item')
    const itemID = proposePayload.entity.id

    const refsRes = await mcpRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'propose_refs',
        arguments: {
          model: 'Item',
          id: itemID,
          changeID,
          refs: [{ refModel: 'Category', refField: 'categories', refs: [] }],
        },
      },
      id: 1,
    })
    expect(refsRes.status).toBe(200)

    // Move the change to PROPOSED - further propose_edit/propose_refs calls should be locked out
    const editChangeRes = await mcpRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'edit_change', arguments: { changeID, status: 'PROPOSED' } },
      id: 1,
    })
    const editChangePayload = JSON.parse(parseSSE(editChangeRes.text)[0].result.content[0].text)
    expect(editChangePayload.status).toBe('PROPOSED')

    const lockedRes = await mcpRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'propose_edit',
        arguments: {
          model: 'Item',
          mode: 'update',
          changeID,
          data: { id: itemID, name: 'Should be rejected' },
        },
      },
      id: 1,
    })
    const lockedEvent = parseSSE(lockedRes.text)[0]
    expect(lockedEvent.result.isError).toBe(true)

    // Move back to DRAFT - edits should succeed again
    await mcpRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: 'edit_change', arguments: { changeID, status: 'DRAFT' } },
      id: 1,
    })

    const reopenedRes = await mcpRequest({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'propose_edit',
        arguments: {
          model: 'Item',
          mode: 'update',
          changeID,
          data: { id: itemID, name: 'MCP Test Item Updated' },
        },
      },
      id: 1,
    })
    const reopenedEvent = parseSSE(reopenedRes.text)[0]
    expect(reopenedEvent.result.isError).toBeFalsy()
    const reopenedPayload = JSON.parse(reopenedEvent.result.content[0].text)
    expect(reopenedPayload.entity.name).toBe('MCP Test Item Updated')
  })
})
