import type { EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'

import { Region } from '@src/geo/region.entity'

export const TEST_REGION_IDS = [
  'wof_90000001',
  'wof_90000002',
  'wof_90000003',
  'wof_90000004',
  'wof_90000005',
]

export const TEST_REGION_ID = TEST_REGION_IDS[0]

export class TestRegionSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    em.create(Region, {
      id: TEST_REGION_IDS[0],
      name: { en: 'Test Region' },
      placetype: 'country',
      adminLevel: 2,
      properties: {
        hierarchy: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    em.create(Region, {
      id: TEST_REGION_IDS[1],
      name: { en: 'Test Region Two' },
      placetype: 'region',
      adminLevel: 4,
      properties: {
        hierarchy: [{ admin_level: 2, id: 90000001, placetype: 'country' }],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    em.create(Region, {
      id: TEST_REGION_IDS[2],
      name: { en: 'Test Region Three' },
      placetype: 'county',
      adminLevel: 6,
      properties: {
        hierarchy: [
          { admin_level: 2, id: 90000001, placetype: 'country' },
          { admin_level: 4, id: 90000002, placetype: 'region' },
        ],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    em.create(Region, {
      id: TEST_REGION_IDS[3],
      name: { en: 'Test Region Four' },
      placetype: 'region',
      adminLevel: 4,
      properties: {
        hierarchy: [{ admin_level: 2, id: 90000001, placetype: 'country' }],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    em.create(Region, {
      id: TEST_REGION_IDS[4],
      name: { en: 'Test Region Five' },
      placetype: 'country',
      adminLevel: 2,
      properties: {
        hierarchy: [],
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await em.flush()
  }
}
