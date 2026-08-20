import { MikroORM } from '@mikro-orm/postgresql'
import { BadRequestException, INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import { graphql } from '@test/gql'
import { SourceType } from '@test/gql/graphql'
import { GraphQLTestClient } from '@test/graphql.utils'
import graphqlUploadExpress from 'graphql-upload/graphqlUploadExpress.mjs'
import request from 'supertest'

import { StorageService } from '@src/common/storage.service'
import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { TestMaterialSeeder } from '@src/db/seeds/TestMaterialSeeder'
import { SOURCE_IDS, TestVariantSeeder } from '@src/db/seeds/TestVariantSeeder'
import { UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'

describe('SourceResolver (integration)', () => {
  let app: INestApplication
  let gql: GraphQLTestClient
  let sourceID: string

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule],
    }).compile()

    app = module.createNestApplication()
    await app.init()

    gql = new GraphQLTestClient(app)

    const orm = module.get<MikroORM>(MikroORM)

    await clearDatabase(orm, 'public', ['users'])
    await orm.seeder.seed(BaseSeeder, UserSeeder, TestMaterialSeeder, TestVariantSeeder)

    await gql.signIn('admin', 'password')

    sourceID = SOURCE_IDS[0]
  })

  afterAll(async () => {
    await app.close()
  })

  test('should query sources with pagination', async () => {
    const res = await gql.send(
      graphql(`
        query SourceResolverListSources($first: Int) {
          sources(first: $first) {
            nodes {
              id
              type
            }
            totalCount
            pageInfo {
              hasNextPage
              hasPreviousPage
            }
          }
        }
      `),
      { first: 10 },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.sources).toBeDefined()
    expect(res.data?.sources.nodes).toHaveLength(res.data?.sources.nodes?.length ?? 0)
    expect(res.data?.sources.totalCount).toBeGreaterThan(0)
  })

  test('should query sources with type filter', async () => {
    const res = await gql.send(
      graphql(`
        query SourceResolverListSourcesByType($type: SourceType, $first: Int) {
          sources(type: $type, first: $first) {
            nodes {
              id
              type
            }
            totalCount
          }
        }
      `),
      {
        type: SourceType.File,
        first: 10,
      },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.sources).toBeDefined()
    expect(res.data?.sources.nodes).toBeDefined()
    expect(Array.isArray(res.data?.sources.nodes)).toBe(true)
    expect(res.data?.sources.nodes?.every((node) => node.type === SourceType.File)).toBe(true)
  })

  test('should query a single source with changes and user', async () => {
    const res = await gql.send(
      graphql(`
        query SourceResolverGetSourceDetail($id: ID!) {
          source(id: $id) {
            id
            type
            contentURL
            location
            metadata
            content
            processedAt
            createdAt
            updatedAt
            user {
              id
              name
            }
            changes {
              nodes {
                id
                title
                description
                status
              }
              totalCount
            }
          }
        }
      `),
      { id: sourceID },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.source).toBeDefined()
    expect(res.data?.source?.id).toBe(sourceID)
    expect(res.data?.source?.user).toBeDefined()
    expect(res.data?.source?.user.id).toBeDefined()
    expect(res.data?.source?.changes).toBeDefined()
    expect(res.data?.source?.changes.nodes).toBeDefined()
    expect(Array.isArray(res.data?.source?.changes.nodes)).toBe(true)
  })

  test('should create a source', async () => {
    const res = await gql.send(
      graphql(`
        mutation SourceResolverCreateSource($input: CreateSourceInput!) {
          createSource(input: $input) {
            source {
              id
              type
            }
          }
        }
      `),
      {
        input: {
          type: SourceType.File,
        },
      },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.createSource?.source).toBeDefined()
    expect(res.data?.createSource?.source?.type).toBe(SourceType.File)
    expect(res.data?.createSource?.source?.id).toBeDefined()
  })

  test('should update a source', async () => {
    const res = await gql.send(
      graphql(`
        mutation SourceResolverUpdateSource($input: UpdateSourceInput!) {
          updateSource(input: $input) {
            source {
              id
              contentURL
            }
          }
        }
      `),
      {
        input: {
          id: sourceID,
          contentURL: 'https://example.com/updated-source.pdf',
        },
      },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.updateSource?.source).toBeDefined()
    expect(res.data?.updateSource?.source?.id).toBe(sourceID)
    expect(res.data?.updateSource?.source?.contentURL).toBe(
      'https://example.com/updated-source.pdf',
    )
  })

  test('should mark source as processed', async () => {
    const res = await gql.send(
      graphql(`
        mutation SourceResolverMarkSourceProcessed($id: ID!) {
          markSourceProcessed(id: $id) {
            success
          }
        }
      `),
      { id: sourceID },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.markSourceProcessed).toBeDefined()
    expect(res.data?.markSourceProcessed?.success).toBe(true)
  })

  test('should delete a source', async () => {
    // Create a new source to delete
    const createRes = await gql.send(
      graphql(`
        mutation SourceResolverCreateSourceToDelete($input: CreateSourceInput!) {
          createSource(input: $input) {
            source {
              id
            }
          }
        }
      `),
      {
        input: {
          type: SourceType.File,
        },
      },
    )
    const idToDelete = createRes.data?.createSource?.source?.id
    if (!idToDelete) {
      throw new Error('Failed to create source for deletion test')
    }

    const res = await gql.send(
      graphql(`
        mutation SourceResolverDeleteSource($id: ID!) {
          deleteSource(id: $id) {
            success
          }
        }
      `),
      { id: idToDelete },
    )
    expect(res.errors).toBeUndefined()
    expect(res.data?.deleteSource).toBeDefined()
    expect(res.data?.deleteSource?.success).toBe(true)
  })

  test('should return null for non-existent source', async () => {
    const res = await gql.send(
      graphql(`
        query SourceResolverGetNonExistentSource($id: ID!) {
          source(id: $id) {
            id
          }
        }
      `),
      { id: 'non-existent-id' },
    )
    expect(res.errors).toBeDefined()
    expect(res.errors?.[0]?.extensions?.code).toBe('NOT_FOUND')
  })

  // Comprehensive Create Tests
  describe('CreateSource comprehensive field tests', () => {
    test('should create source with all fields', async () => {
      const res = await gql.send(
        graphql(`
          mutation CreateSourceAllFields($input: CreateSourceInput!) {
            createSource(input: $input) {
              source {
                id
                type
                contentURL
                content
                metadata
              }
            }
          }
        `),
        {
          input: {
            type: SourceType.Url,
            text: 'Recycling Guide body text',
            contentURL: 'https://cdn.example.com/content.json',
            metadata: { author: 'Test Author', date: '2024-01-01' },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.createSource?.source).toBeDefined()
      expect(res.data?.createSource?.source?.type).toBe(SourceType.Url)
      expect(res.data?.createSource?.source?.contentURL).toBe(
        'https://cdn.example.com/content.json',
      )
      expect(res.data?.createSource?.source?.content).toMatchObject({
        text: 'Recycling Guide body text',
      })
      expect(res.data?.createSource?.source?.metadata).toMatchObject({
        author: 'Test Author',
        date: '2024-01-01',
      })
      expect(res.data?.createSource?.source?.id).toBeDefined()
    })

    test('should create source for each SourceType', async () => {
      const types = [SourceType.File, SourceType.Image, SourceType.Url, SourceType.Pdf]
      for (const type of types) {
        const res = await gql.send(
          graphql(`
            mutation CreateSourceWithType($input: CreateSourceInput!) {
              createSource(input: $input) {
                source {
                  id
                  type
                }
              }
            }
          `),
          {
            input: { type },
          },
        )
        expect(res.errors).toBeUndefined()
        expect(res.data?.createSource?.source).toBeDefined()
        expect(res.data?.createSource?.source?.type).toBe(type)
        expect(res.data?.createSource?.source?.id).toBeDefined()
      }
    })
  })

  // LinkSource Tests
  describe('linkSource', () => {
    test('should link a JSON-LD node to a source', async () => {
      const res = await gql.send(
        graphql(`
          mutation SourceResolverLinkSource($input: LinkSourceInput!) {
            linkSource(input: $input) {
              source {
                id
                content
              }
            }
          }
        `),
        {
          input: {
            id: sourceID,
            jsonld: {
              '@id': 'http://g.co/kg/m/05z87',
              '@type': ['Thing'],
              name: 'Plastic',
              detailedDescription: {
                url: 'https://en.wikipedia.org/wiki/Plastic',
                license:
                  'https://en.wikipedia.org/wiki/Wikipedia:Text_of_Creative_Commons_Attribution-ShareAlike_3.0_Unported_License',
                articleBody:
                  'Plastics are a wide range of synthetic or semisynthetic materials composed primarily of polymers. Their defining characteristic, plasticity, allows them to be molded, extruded, or pressed into a diverse range of solid forms. ',
              },
            },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.linkSource?.source).toBeDefined()
      expect(res.data?.linkSource?.source?.id).toBe(sourceID)
      expect(res.data?.linkSource?.source?.content).toBeDefined()
      const content = res.data?.linkSource?.source?.content as Record<string, unknown>
      const doc = content.jsonld as Record<string, unknown>
      expect(doc['@context']).toBeDefined()
      const graph = doc['@graph'] as Array<Record<string, unknown>>
      expect(Array.isArray(graph)).toBe(true)
      expect(graph.some((n) => n['@id'] === 'http://g.co/kg/m/05z87')).toBe(true)
    })

    test('should replace an existing JSON-LD node with the same @id', async () => {
      // First link
      await gql.send(
        graphql(`
          mutation SourceResolverLinkFirst($input: LinkSourceInput!) {
            linkSource(input: $input) {
              source {
                id
              }
            }
          }
        `),
        {
          input: {
            id: sourceID,
            jsonld: {
              '@id': 'http://g.co/kg/glass',
              '@type': 'Material',
              name: 'Glass',
            },
          },
        },
      )
      // Link again with same @id but different data
      const res = await gql.send(
        graphql(`
          mutation SourceResolverLinkReplace($input: LinkSourceInput!) {
            linkSource(input: $input) {
              source {
                id
                content
              }
            }
          }
        `),
        {
          input: {
            id: sourceID,
            jsonld: {
              '@id': 'http://g.co/kg/glass',
              '@type': 'Material',
              name: 'Updated Glass',
            },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      const content = res.data?.linkSource?.source?.content as Record<string, unknown>
      const doc = content.jsonld as Record<string, unknown>
      const graph = doc['@graph'] as Array<Record<string, unknown>>
      const glassNodes = graph.filter((n) => n['@id'] === 'http://g.co/kg/glass')
      expect(glassNodes).toHaveLength(1)
    })

    test('should accept a Wikidata entity IRI', async () => {
      const res = await gql.send(
        graphql(`
          mutation SourceResolverLinkWikidata($input: LinkSourceInput!) {
            linkSource(input: $input) {
              source {
                id
                content
              }
            }
          }
        `),
        {
          input: {
            id: sourceID,
            jsonld: {
              '@id': 'http://www.wikidata.org/entity/Q11469',
              '@type': 'Material',
            },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.linkSource?.source).toBeDefined()
      const content = res.data?.linkSource?.source?.content as Record<string, unknown>
      const doc = content.jsonld as Record<string, unknown>
      const graph = doc['@graph'] as Array<Record<string, unknown>>
      expect(graph.some((n) => n['@id'] === 'wd:Q11469')).toBe(true)
    })

    test('should reject an invalid @id IRI', async () => {
      const res = await gql.send(
        graphql(`
          mutation SourceResolverLinkInvalidId($input: LinkSourceInput!) {
            linkSource(input: $input) {
              source {
                id
              }
            }
          }
        `),
        {
          input: {
            id: sourceID,
            jsonld: {
              '@id': 'https://example.com/not-valid',
              '@type': 'Material',
            },
          },
        },
      )
      expect(res.errors).toBeDefined()
    })

    test('should reject invalid JSON-LD document', async () => {
      const res = await gql.send(
        graphql(`
          mutation SourceResolverLinkInvalidJsonLd($input: LinkSourceInput!) {
            linkSource(input: $input) {
              source {
                id
              }
            }
          }
        `),
        {
          input: {
            id: sourceID,
            jsonld: {
              '@id': 'http://g.co/kg/test',
              '@type': 'Material',
              '@value': 'bad',
            },
          },
        },
      )
      expect(res.errors).toBeDefined()
    })
  })

  // UnlinkSource Tests
  describe('unlinkSource', () => {
    test('should unlink a JSON-LD node from a source', async () => {
      // First, link a node
      await gql.send(
        graphql(`
          mutation SourceResolverLinkForUnlink($input: LinkSourceInput!) {
            linkSource(input: $input) {
              source {
                id
              }
            }
          }
        `),
        {
          input: {
            id: sourceID,
            jsonld: {
              '@id': 'http://g.co/kg/aluminum',
              '@type': 'Material',
              name: 'Aluminum',
            },
          },
        },
      )
      // Now unlink it
      const res = await gql.send(
        graphql(`
          mutation SourceResolverUnlinkSource($input: UnlinkSourceInput!) {
            unlinkSource(input: $input) {
              source {
                id
                content
              }
            }
          }
        `),
        {
          input: {
            id: sourceID,
            jsonld: {
              '@id': 'http://g.co/kg/aluminum',
            },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.unlinkSource?.source).toBeDefined()
      expect(res.data?.unlinkSource?.source?.id).toBe(sourceID)
      const content = res.data?.unlinkSource?.source?.content as Record<string, unknown>
      const doc = content.jsonld as Record<string, unknown>
      const graph = (doc?.['@graph'] ?? []) as Array<Record<string, unknown>>
      expect(graph.some((n) => n['@id'] === 'http://g.co/kg/aluminum')).toBe(false)
    })

    test('should be a no-op when unlinking a non-existent @id', async () => {
      const res = await gql.send(
        graphql(`
          mutation SourceResolverUnlinkNonExistent($input: UnlinkSourceInput!) {
            unlinkSource(input: $input) {
              source {
                id
                content
              }
            }
          }
        `),
        {
          input: {
            id: sourceID,
            jsonld: {
              '@id': 'http://g.co/kg/does-not-exist',
            },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.unlinkSource?.source).toBeDefined()
      expect(res.data?.unlinkSource?.source?.id).toBe(sourceID)
    })

    test('should reject an invalid @id IRI', async () => {
      const res = await gql.send(
        graphql(`
          mutation SourceResolverUnlinkInvalidId($input: UnlinkSourceInput!) {
            unlinkSource(input: $input) {
              source {
                id
              }
            }
          }
        `),
        {
          input: {
            id: sourceID,
            jsonld: {
              '@id': 'not-a-valid-iri',
            },
          },
        },
      )
      expect(res.errors).toBeDefined()
    })

    test('should reject invalid JSON-LD document', async () => {
      const res = await gql.send(
        graphql(`
          mutation SourceResolverUnlinkInvalidJsonLd($input: UnlinkSourceInput!) {
            unlinkSource(input: $input) {
              source {
                id
              }
            }
          }
        `),
        {
          input: {
            id: sourceID,
            jsonld: {
              '@id': 'http://g.co/kg/test',
              '@value': 'bad',
            },
          },
        },
      )
      expect(res.errors).toBeDefined()
    })

    test('should not affect other linked nodes', async () => {
      // Link two nodes
      await gql.send(
        graphql(`
          mutation SourceResolverLinkNodeA($input: LinkSourceInput!) {
            linkSource(input: $input) {
              source {
                id
              }
            }
          }
        `),
        {
          input: {
            id: sourceID,
            jsonld: {
              '@id': 'http://g.co/kg/steel',
              '@type': 'Material',
            },
          },
        },
      )
      await gql.send(
        graphql(`
          mutation SourceResolverLinkNodeB($input: LinkSourceInput!) {
            linkSource(input: $input) {
              source {
                id
              }
            }
          }
        `),
        {
          input: {
            id: sourceID,
            jsonld: {
              '@id': 'http://g.co/kg/copper',
              '@type': 'Material',
            },
          },
        },
      )
      // Unlink only steel
      const res = await gql.send(
        graphql(`
          mutation SourceResolverUnlinkNodeA($input: UnlinkSourceInput!) {
            unlinkSource(input: $input) {
              source {
                id
                content
              }
            }
          }
        `),
        {
          input: {
            id: sourceID,
            jsonld: {
              '@id': 'http://g.co/kg/steel',
            },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      const content = res.data?.unlinkSource?.source?.content as Record<string, unknown>
      const doc = content.jsonld as Record<string, unknown>
      const graph = doc['@graph'] as Array<Record<string, unknown>>
      expect(graph.some((n) => n['@id'] === 'http://g.co/kg/steel')).toBe(false)
      expect(graph.some((n) => n['@id'] === 'http://g.co/kg/copper')).toBe(true)
    })
  })

  // Comprehensive Update Tests
  describe('UpdateSource comprehensive field tests', () => {
    test('should update source fields', async () => {
      const res = await gql.send(
        graphql(`
          mutation UpdateSourceAllFields($input: UpdateSourceInput!) {
            updateSource(input: $input) {
              source {
                id
                contentURL
                content
                metadata
              }
            }
          }
        `),
        {
          input: {
            id: sourceID,
            text: 'updated text',
            contentURL: 'https://updated-content.com/data.json',
            metadata: { updatedBy: 'Test User' },
          },
        },
      )
      expect(res.errors).toBeUndefined()
      expect(res.data?.updateSource?.source).toBeDefined()
      expect(res.data?.updateSource?.source?.contentURL).toBe(
        'https://updated-content.com/data.json',
      )
      expect(res.data?.updateSource?.source?.content).toMatchObject({ text: 'updated text' })
      expect(res.data?.updateSource?.source?.metadata).toMatchObject({ updatedBy: 'Test User' })
      expect(res.data?.updateSource?.source?.id).toBe(sourceID)
    })
  })
})

const UPLOAD_MUTATION = `
  mutation UploadSourceMutation($input: UploadSourceInput!) {
    uploadSource(input: $input) {
      source {
        id
        type
        location
      }
    }
  }
`

describe('SourceResolver uploadSource (integration)', () => {
  let app: INestApplication
  let cookies: string[]
  let otherUserCookies: string[]
  let sourceId: string
  const mockUploadSource = vi.fn()

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule],
    })
      .overrideProvider(StorageService)
      .useValue({ uploadSource: mockUploadSource })
      .compile()

    app = module.createNestApplication()
    app.use(graphqlUploadExpress({ maxFileSize: 10_000_000, maxFiles: 1 }))
    await app.init()

    const orm = module.get<MikroORM>(MikroORM)
    await clearDatabase(orm, 'public', ['users'])
    await orm.seeder.seed(BaseSeeder, UserSeeder)

    const signInRes = await request(app.getHttpServer())
      .post('/auth/sign-in/username')
      .send({ username: 'admin', password: 'password' })

    const setCookie = signInRes.headers['set-cookie']
    cookies = Array.isArray(setCookie) ? setCookie : [setCookie]

    // Sign in as a different user for ownership tests
    const otherSignInRes = await request(app.getHttpServer())
      .post('/auth/sign-in/username')
      .send({ username: 'user', password: 'password' })

    const otherSetCookie = otherSignInRes.headers['set-cookie']
    otherUserCookies = Array.isArray(otherSetCookie) ? otherSetCookie : [otherSetCookie]

    // Create a Source owned by admin to use across tests
    const createRes = await request(app.getHttpServer())
      .post('/graphql')
      .set('Cookie', cookies.map((c) => c.split(';')[0]).join('; '))
      .send({
        query: `
          mutation {
            createSource(input: { type: IMAGE }) {
              source { id }
            }
          }
        `,
      })
    sourceId = createRes.body.data?.createSource?.source?.id
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    mockUploadSource.mockReset()
  })

  function cookieStr() {
    return cookies.map((c) => c.split(';')[0]).join('; ')
  }

  function otherCookieStr() {
    return otherUserCookies.map((c) => c.split(';')[0]).join('; ')
  }

  async function sendUpload(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
    opts: { authenticated?: boolean; sid?: string; cookieOverride?: string } = {},
  ) {
    const { authenticated = true, sid = sourceId, cookieOverride } = opts
    let req = request(app.getHttpServer())
      .post('/graphql')
      .set('apollo-require-preflight', '1')
      .field(
        'operations',
        JSON.stringify({
          query: UPLOAD_MUTATION,
          variables: { input: { source: sid, file: null } },
        }),
      )
      .field('map', JSON.stringify({ '0': ['variables.input.file'] }))
      .attach('0', fileBuffer, { filename, contentType: mimeType })

    if (authenticated) {
      req = req.set('Cookie', cookieOverride ?? cookieStr())
    }

    return req
  }

  test('uploads an image and returns a Source with type IMAGE', async () => {
    mockUploadSource.mockResolvedValue({
      cdnUrl: 'cdn://sources/uploads/abc123.jpg',
      sourceType: 'IMAGE',
    })

    const res = await sendUpload(Buffer.from('fake-image-data'), 'photo.jpg', 'image/jpeg')

    expect(res.body.errors).toBeUndefined()
    expect(res.body.data?.uploadSource?.source).toBeDefined()
    expect(res.body.data?.uploadSource?.source?.type).toBe(SourceType.Image)
    expect(res.body.data?.uploadSource?.source?.location).toBe('cdn://sources/uploads/abc123.jpg')
    expect(res.body.data?.uploadSource?.source?.id).toBeDefined()
    expect(mockUploadSource).toHaveBeenCalledOnce()
  })

  test('uploads a PDF and returns a Source with type PDF', async () => {
    mockUploadSource.mockResolvedValue({
      cdnUrl: 'cdn://sources/uploads/abc123.pdf',
      sourceType: 'PDF',
    })

    const res = await sendUpload(Buffer.from('fake-pdf-data'), 'document.pdf', 'application/pdf')

    expect(res.body.errors).toBeUndefined()
    expect(res.body.data?.uploadSource?.source?.type).toBe(SourceType.Pdf)
    expect(res.body.data?.uploadSource?.source?.location).toBe('cdn://sources/uploads/abc123.pdf')
  })

  test('rejects a video file', async () => {
    mockUploadSource.mockRejectedValue(new BadRequestException('Unsupported file type: video/mp4'))

    const res = await sendUpload(Buffer.from('fake-video-data'), 'clip.mp4', 'video/mp4')

    expect(res.body.errors).toBeDefined()
    expect(res.body.errors[0]?.message).toContain('Unsupported file type')
  })

  test('passes metadata to the Source', async () => {
    mockUploadSource.mockResolvedValue({
      cdnUrl: 'cdn://sources/uploads/meta.jpg',
      sourceType: 'IMAGE',
    })

    const res = await request(app.getHttpServer())
      .post('/graphql')
      .set('Cookie', cookieStr())
      .set('apollo-require-preflight', '1')
      .field(
        'operations',
        JSON.stringify({
          query: `
            mutation UploadSourceWithMeta($input: UploadSourceInput!) {
              uploadSource(input: $input) {
                source { id type metadata }
              }
            }
          `,
          variables: {
            input: { source: sourceId, file: null, metadata: { author: 'test-user' } },
          },
        }),
      )
      .field('map', JSON.stringify({ '0': ['variables.input.file'] }))
      .attach('0', Buffer.from('fake-image'), 'photo.jpg')

    expect(res.body.errors).toBeUndefined()
    expect(res.body.data?.uploadSource?.source?.metadata).toMatchObject({ author: 'test-user' })
  })

  test('returns an error for an unsupported file type', async () => {
    mockUploadSource.mockRejectedValue(new BadRequestException('Unsupported file type: audio/mpeg'))

    const res = await sendUpload(Buffer.from('fake-audio'), 'track.mp3', 'audio/mpeg')

    expect(res.body.errors).toBeDefined()
    expect(res.body.errors[0]?.message).toContain('Unsupported file type')
  })

  test('rejects upload by a non-owner', async () => {
    const res = await sendUpload(Buffer.from('fake-image-data'), 'photo.jpg', 'image/jpeg', {
      cookieOverride: otherCookieStr(),
    })

    expect(res.body.errors).toBeDefined()
    expect(res.body.errors[0]?.message).toMatch(/permission|forbidden/i)
  })

  test('requires authentication', async () => {
    const res = await sendUpload(Buffer.from('fake-image-data'), 'photo.jpg', 'image/jpeg', {
      authenticated: false,
    })

    expect(res.body.errors).toBeDefined()
  })
})
