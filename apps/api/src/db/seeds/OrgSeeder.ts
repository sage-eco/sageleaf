import type { EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'

import { Org } from '@src/users/org.entity'

export const EXTRA_ORG_SLUGS = [
  'greenloop-recycling',
  'terra-reclaim',
  'reloop-marketplace',
  'circular-futures',
]

export class OrgSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const org = await em.findOne(Org, {
      slug: 'sage',
    })
    if (!org) {
      em.create(Org, {
        name: 'Sage',
        slug: 'sage',
        desc: {
          en: 'Sage is a circular economy database',
        },
        metadata: '{}',
        updatedAt: new Date(),
        createdAt: new Date(),
      })
    }

    const greenloop = await em.findOne(Org, {
      slug: EXTRA_ORG_SLUGS[0],
    })
    if (!greenloop) {
      em.create(Org, {
        name: 'GreenLoop Recycling',
        slug: EXTRA_ORG_SLUGS[0],
        desc: {
          en: 'A municipal recycling operator processing plastics, metals, and paper',
        },
        metadata: '{}',
        updatedAt: new Date(),
        createdAt: new Date(),
      })
    }

    const terraReclaim = await em.findOne(Org, {
      slug: EXTRA_ORG_SLUGS[1],
    })
    if (!terraReclaim) {
      em.create(Org, {
        name: 'Terra Reclaim',
        slug: EXTRA_ORG_SLUGS[1],
        desc: {
          en: 'A materials reclaimer specializing in electronics and battery recovery',
        },
        metadata: '{}',
        updatedAt: new Date(),
        createdAt: new Date(),
      })
    }

    const reloop = await em.findOne(Org, {
      slug: EXTRA_ORG_SLUGS[2],
    })
    if (!reloop) {
      em.create(Org, {
        name: 'ReLoop Marketplace',
        slug: EXTRA_ORG_SLUGS[2],
        desc: {
          en: 'An online marketplace for buying and selling reused furniture and appliances',
        },
        metadata: '{}',
        updatedAt: new Date(),
        createdAt: new Date(),
      })
    }

    const circularFutures = await em.findOne(Org, {
      slug: EXTRA_ORG_SLUGS[3],
    })
    if (!circularFutures) {
      em.create(Org, {
        name: 'Circular Futures',
        slug: EXTRA_ORG_SLUGS[3],
        desc: {
          en: 'A nonprofit advocating for sustainable, circular-economy policy and education',
        },
        metadata: '{}',
        updatedAt: new Date(),
        createdAt: new Date(),
      })
    }
  }
}
