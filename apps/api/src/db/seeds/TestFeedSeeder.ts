import type { EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'

import { REGION_IDS } from '@src/db/seeds/RegionSeeder'
import { HomeFeed } from '@src/feed/home-feed.entity'
import { Region } from '@src/geo/region.entity'

export const FEED_IDS = [
  'feed_test_global_1000',
  'feed_test_global_1500',
  'feed_test_region_2000',
  'feed_test_external_3000',
  'feed_test_announcement_3500',
]

export class TestFeedSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    em.create(HomeFeed, {
      id: FEED_IDS[0],
      rank: 1000,
      format: 'ANNOUNCEMENT',
      title: { en: 'Global Announcement', sv: 'Globalt Meddelande' },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    em.create(HomeFeed, {
      id: FEED_IDS[1],
      rank: 1500,
      format: 'ARTICLE',
      title: { en: 'Global Article' },
      content: { markdown: { en: 'Some **markdown** content here.' } },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    em.create(HomeFeed, {
      id: FEED_IDS[2],
      rank: 2000,
      format: 'UPDATE',
      title: { en: 'Region Update' },
      region: em.getReference(Region, REGION_IDS[2]), // wof_85633793 (US)
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    em.create(HomeFeed, {
      id: FEED_IDS[3],
      rank: 3000,
      format: 'EXTERNAL',
      title: { en: 'External Link' },
      links: {
        externalLink: {
          url: 'https://example.com/article',
          openGraph: {
            title: 'Example Article',
            description: 'An example description',
            image: 'https://example.com/og.jpg',
            siteName: 'Example Site',
          },
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    em.create(HomeFeed, {
      id: FEED_IDS[4],
      rank: 3500,
      format: 'ANNOUNCEMENT',
      title: { en: 'Seasonal Recycling Update', sv: 'Säsongsuppdatering om återvinning' },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await em.flush()
  }
}
