import type { EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'

import { Region } from '@src/geo/region.entity'
import { Process, ProcessIntent } from '@src/process/process.entity'
import { Org } from '@src/users/org.entity'

export const PROCESS_IDS = [
  'proc_test0001',
  'proc_test0002',
  'proc_test0003',
  'proc_test0004',
  'proc_test0005',
]

export const ORG_IDS = ['org_test0001', 'org_test0002']

export const REGION_IDS = ['wof_test0001', 'wof_test0002']

const PROCESS_NAMES = [
  {
    en: 'PET Bottle Recycling',
    sv: 'Återvinning av PET-flaskor',
    desc: {
      en: 'Sorting and reprocessing PET plastic bottles into new material',
      sv: 'Sortering och omarbetning av PET-plastflaskor till nytt material',
    },
  },
  {
    en: 'Aluminum Can Smelting',
    sv: 'Smältning av aluminiumburkar',
    desc: {
      en: 'Melting down aluminum cans to produce reusable ingots',
      sv: 'Smältning av aluminiumburkar för att producera återanvändbara tackor',
    },
  },
  {
    en: 'E-Waste Component Recovery',
    sv: 'Återvinning av elektronikkomponenter',
    desc: {
      en: 'Disassembling electronics to recover valuable components and metals',
      sv: 'Isärtagning av elektronik för att återvinna värdefulla komponenter och metaller',
    },
  },
  {
    en: 'Textile Fiber Reclamation',
    sv: 'Återvinning av textilfibrer',
    desc: {
      en: 'Shredding and reprocessing textiles into reusable fiber',
      sv: 'Strimling och omarbetning av textilier till återanvändbar fiber',
    },
  },
  {
    en: 'Glass Cullet Processing',
    sv: 'Bearbetning av glaskross',
    desc: {
      en: 'Crushing and cleaning glass for reuse in new glass products',
      sv: 'Krossning och rengöring av glas för återanvändning i nya glasprodukter',
    },
  },
]

export class TestProcessSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    // Create test regions
    for (const id of REGION_IDS) {
      em.create(Region, {
        id,
        name: { en: `Region ${id}`, sv: `Region ${id} Svenska` },
        properties: {
          hierarchy: [],
          'geom:bbox': '-180,-90,180,90',
          'lbl:min_zoom': 10,
          'lbl:max_zoom': 14,
        },
        placetype: 'region',
        adminLevel: 4,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    // Create test orgs
    for (const id of ORG_IDS) {
      em.create(Org, {
        id,
        name: `Test Org ${id}`,
        slug: id.toLowerCase(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    // Create test processes
    for (let i = 0; i < PROCESS_IDS.length; i++) {
      const processId = PROCESS_IDS[i]
      const { en, sv, desc } = PROCESS_NAMES[i]
      em.create(Process, {
        id: processId,
        name: { en, sv },
        desc,
        intent: ProcessIntent.RECYCLE,
        instructions: {},
        efficiency: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    await em.flush()
  }
}
