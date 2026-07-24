import type { EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'

import { Tag, TagType } from '@src/process/tag.entity'

export const TAG_IDS = [
  'tag1_AAAAAAAAAAAAAAAA',
  'tag2_BBBBBBBBBBBBBBBB',
  'tag3_CCCCCCCCCCCCCCCC',
  'tag4_DDDDDDDDDDDDDDDD',
  'tag5_EEEEEEEEEEEEEEEE',
]

export class TestTagSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    // Create tag definitions with proper JSON Schema metaTemplates
    em.create(Tag, {
      id: TAG_IDS[0],
      name: 'Recyclable',
      desc: 'Items that can be recycled',
      type: TagType.COMPONENT,
      bgColor: '#00FF00',
      metaTemplate: {
        schema: {
          type: 'object',
          properties: {
            score: { type: 'number' },
          },
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    em.create(Tag, {
      id: TAG_IDS[1],
      name: 'Biodegradable',
      desc: 'Items that naturally decompose',
      type: TagType.PLACE,
      bgColor: '#00AA00',
      metaTemplate: {
        schema: {
          type: 'object',
          properties: {
            time: { type: 'string' },
          },
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    em.create(Tag, {
      id: TAG_IDS[2],
      name: 'Reusable',
      desc: 'Items that can be reused',
      type: TagType.VARIANT,
      bgColor: '#0000FF',
      metaTemplate: {
        schema: {
          type: 'object',
          properties: {
            count: { type: 'number' },
          },
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    em.create(Tag, {
      id: TAG_IDS[3],
      name: 'Hazardous',
      desc: 'Items that require special disposal',
      type: TagType.COMPONENT,
      bgColor: '#FF0000',
      metaTemplate: {
        schema: {
          type: 'object',
          properties: {
            level: { type: 'string' },
          },
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    em.create(Tag, {
      id: TAG_IDS[4],
      name: 'Compostable',
      desc: 'Items that break down safely in composting conditions',
      type: TagType.COMPONENT,
      bgColor: '#8B5A2B',
      metaTemplate: {
        schema: {
          type: 'object',
          properties: {
            days: { type: 'number' },
          },
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await em.flush()
  }
}
