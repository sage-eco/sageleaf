import type { EntityManager } from '@mikro-orm/core'
import { Seeder } from '@mikro-orm/seeder'

import { Program, ProgramStatus } from '@src/process/program.entity'

export const PROGRAM_IDS = [
  'prog_test0001',
  'prog_test0002',
  'prog_test0003',
  'prog_test0004',
  'prog_test0005',
]

const PROGRAM_NAMES = [
  {
    en: 'San Francisco Curbside Recycling',
    sv: 'San Franciscos kantstensåtervinning',
    desc: {
      en: 'Municipal curbside collection program for recyclable household waste',
      sv: 'Kommunalt kantstensinsamlingsprogram för återvinningsbart hushållsavfall',
    },
  },
  {
    en: 'Bay Area E-Waste Drop-off',
    sv: 'Bay Areas elektronikinsamling',
    desc: {
      en: 'Community drop-off program for electronics and battery recycling',
      sv: 'Insamlingsprogram för elektronik och batteriåtervinning i lokalsamhället',
    },
  },
  {
    en: 'Stockholm Textile Collection',
    sv: 'Stockholms textilinsamling',
    desc: {
      en: 'Citywide program collecting used textiles for reuse and recycling',
      sv: 'Stadsomfattande program som samlar in använda textilier för återanvändning och återvinning',
    },
  },
  {
    en: 'Neighborhood Composting Initiative',
    sv: 'Kompostinitiativ i bostadsområdet',
    desc: {
      en: 'Community-run program turning food scraps into compost',
      sv: 'Lokalt drivet program som förvandlar matrester till kompost',
    },
  },
  {
    en: 'Community Reuse Exchange',
    sv: 'Lokalsamhällets återanvändningsbyte',
    desc: {
      en: 'Program facilitating the exchange of used furniture and household goods',
      sv: 'Program som underlättar utbyte av begagnade möbler och hushållsartiklar',
    },
  },
]

export class TestProgramSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    for (let i = 0; i < PROGRAM_IDS.length; i++) {
      const programId = PROGRAM_IDS[i]
      const { en, sv, desc } = PROGRAM_NAMES[i]
      em.create(Program, {
        id: programId,
        name: { en, sv },
        desc,
        status: ProgramStatus.ACTIVE,
        social: {},
        instructions: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    }

    await em.flush()
  }
}
