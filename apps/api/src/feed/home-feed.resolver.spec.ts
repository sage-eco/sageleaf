import { MikroORM } from '@mikro-orm/postgresql'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import { graphql } from '@test/gql'
import { GraphQLTestClient } from '@test/graphql.utils'

import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import { REGION_IDS, RegionSeeder } from '@src/db/seeds/RegionSeeder'
import { FEED_IDS, TestFeedSeeder } from '@src/db/seeds/TestFeedSeeder'
import { UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'

describe('HomeFeedResolver (integration)', () => {
  let app: INestApplication
  let gql: GraphQLTestClient

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule],
    }).compile()

    app = module.createNestApplication()
    await app.init()

    gql = new GraphQLTestClient(app)

    const orm = module.get<MikroORM>(MikroORM)
    await clearDatabase(orm, 'public', ['users'])
    await orm.seeder.seed(BaseSeeder, UserSeeder, RegionSeeder, TestFeedSeeder)
  })

  afterAll(async () => {
    await app.close()
  })

  test('returns all feed items in rank order when no regionId filter is given', async () => {
    const res = await gql.send(
      graphql(`
        query HomeFeedAll($first: Int) {
          feed(first: $first) {
            nodes {
              id
              format
              title
              shareText
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
    const nodes = res.data?.feed.nodes!
    expect(nodes.length).toBe(5)
    expect(res.data?.feed.totalCount).toBe(5)
    // Verify rank order: 1000 < 1500 < 2000 < 3000 < 3500
    expect(nodes[0].id).toBe(FEED_IDS[0])
    expect(nodes[1].id).toBe(FEED_IDS[1])
    expect(nodes[2].id).toBe(FEED_IDS[2])
    expect(nodes[3].id).toBe(FEED_IDS[3])
    expect(nodes[4].id).toBe(FEED_IDS[4])
  })

  test('filters items by regionId', async () => {
    const res = await gql.send(
      graphql(`
        query HomeFeedByRegion($region: ID, $first: Int) {
          feed(region: $region, first: $first) {
            nodes {
              id
              format
            }
            totalCount
          }
        }
      `),
      { region: REGION_IDS[2], first: 10 },
    )
    expect(res.errors).toBeUndefined()
    const nodes = res.data?.feed.nodes!
    expect(nodes.length).toBe(1)
    expect(nodes[0].id).toBe(FEED_IDS[2])
  })

  test('resolves title for request language', async () => {
    gql.setLanguage('sv')
    const res = await gql.send(
      graphql(`
        query HomeFeedTitleSv($first: Int) {
          feed(first: $first) {
            nodes {
              id
              title
            }
          }
        }
      `),
      { first: 1 },
    )
    gql.setLanguage('en')
    expect(res.errors).toBeUndefined()
    // FEED_IDS[0] has sv: 'Globalt Meddelande'
    expect(res.data?.feed.nodes![0].title).toBe('Globalt Meddelande')
  })

  test('shareText includes prefix for ANNOUNCEMENT format', async () => {
    const res = await gql.send(
      graphql(`
        query HomeFeedShareTextAnnouncement($first: Int) {
          feed(first: $first) {
            nodes {
              id
              format
              shareText
            }
          }
        }
      `),
      { first: 1 },
    )
    expect(res.errors).toBeUndefined()
    const item = res.data?.feed.nodes![0]!
    expect(item.format).toBe('ANNOUNCEMENT')
    expect(item.shareText).toBe('Announcement: Global Announcement')
  })

  test('shareText includes URL for EXTERNAL format', async () => {
    const res = await gql.send(
      graphql(`
        query HomeFeedShareTextExternal($first: Int) {
          feed(first: $first) {
            nodes {
              id
              format
              shareText
              externalLink {
                url
              }
            }
          }
        }
      `),
      { first: 10 },
    )
    expect(res.errors).toBeUndefined()
    const externalItem = res.data?.feed.nodes!.find((n) => n.format === 'EXTERNAL')!
    expect(externalItem.shareText).toBe('External Link — https://example.com/article')
  })

  test('resolves openGraph fields for EXTERNAL format item', async () => {
    const res = await gql.send(
      graphql(`
        query HomeFeedExternalOpenGraph($first: Int) {
          feed(first: $first) {
            nodes {
              id
              format
              externalLink {
                url
                openGraph {
                  title
                  description
                  image
                  siteName
                }
              }
            }
          }
        }
      `),
      { first: 10 },
    )
    expect(res.errors).toBeUndefined()
    const externalItem = res.data?.feed.nodes!.find((n) => n.format === 'EXTERNAL')!
    expect(externalItem.externalLink?.url).toBe('https://example.com/article')
    expect(externalItem.externalLink?.openGraph?.title).toBe('Example Article')
    expect(externalItem.externalLink?.openGraph?.description).toBe('An example description')
    expect(externalItem.externalLink?.openGraph?.image).toBe('https://example.com/og.jpg')
    expect(externalItem.externalLink?.openGraph?.siteName).toBe('Example Site')
  })

  test('resolves markdown and markdownShort from content', async () => {
    const res = await gql.send(
      graphql(`
        query HomeFeedMarkdown($first: Int) {
          feed(first: $first) {
            nodes {
              id
              markdown
              markdownShort
            }
          }
        }
      `),
      { first: 10 },
    )
    expect(res.errors).toBeUndefined()
    const articleItem = res.data?.feed.nodes!.find((n) => n.id === FEED_IDS[1])!
    expect(articleItem.markdown).toBe('Some **markdown** content here.')
    expect(articleItem.markdownShort).toBe('Some **markdown** content here.')
  })
})
