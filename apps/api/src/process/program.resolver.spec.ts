import { MikroORM } from '@mikro-orm/postgresql'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import { AppTestModule } from '@test/app-test.module'
import { graphql } from '@test/gql'
import { ChangeStatus } from '@test/gql/types.generated'
import { GraphQLTestClient } from '@test/graphql.utils'

import { BaseSeeder } from '@src/db/seeds/BaseSeeder'
import {
  ORG_IDS,
  PROCESS_IDS,
  REGION_IDS,
  TestProcessSeeder,
} from '@src/db/seeds/TestProcessSeeder'
import { PROGRAM_IDS, TestProgramSeeder } from '@src/db/seeds/TestProgramSeeder'
import { TAG_IDS, TestTagSeeder } from '@src/db/seeds/TestTagSeeder'
import { UserSeeder } from '@src/db/seeds/UserSeeder'
import { clearDatabase } from '@src/db/test.utils'
import { Program, ProgramsOrgs, ProgramsProcesses, ProgramsTags } from '@src/process/program.entity'
import { WindmillMockService } from '@src/windmill/windmill.mock.service'
import { WindmillService } from '@src/windmill/windmill.service'

describe('ProgramResolver (integration)', () => {
  let app: INestApplication
  let gql: GraphQLTestClient
  let orm: MikroORM
  let programID: string
  let changeID: string

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppTestModule],
    })
      .overrideProvider(WindmillService)
      .useClass(WindmillMockService)
      .compile()

    app = module.createNestApplication()
    await app.init()

    gql = new GraphQLTestClient(app)

    orm = module.get<MikroORM>(MikroORM)

    await clearDatabase(orm, 'public', ['users'])
    await orm.seeder.seed(
      BaseSeeder,
      UserSeeder,
      TestProgramSeeder,
      TestProcessSeeder,
      TestTagSeeder,
    )

    await gql.signIn('admin', 'password')

    programID = PROGRAM_IDS[0]
  })

  afterAll(async () => {
    await app.close()
  })

  test('should query programs with pagination', async () => {
    const res = await gql.send(
      graphql(`
        query ProgramResolverListPrograms($first: Int) {
          programs(first: $first) {
            nodes {
              id
              name
            }
            totalCount
          }
        }
      `),
      { first: 10 },
    )
    expect(res.data?.programs.nodes?.length).toBeGreaterThan(0)
    expect(res.data?.programs.totalCount).toBeGreaterThan(0)
  })

  test('should query a single program', async () => {
    const res = await gql.send(
      graphql(`
        query ProgramResolverGetProgram($id: ID!) {
          program(id: $id) {
            id
            name
          }
        }
      `),
      { id: programID },
    )
    expect(res.data?.program).toBeDefined()
    expect(res.data?.program?.id).toBe(programID)
  })

  test('should create a program', async () => {
    const res = await gql.send(
      graphql(`
        mutation ProgramResolverCreateProgram($input: CreateProgramInput!) {
          createProgram(input: $input) {
            program {
              id
              name
              status
            }
          }
        }
      `),
      {
        input: {
          nameTr: [{ lang: 'en', text: 'New Program' }],
          status: 'ACTIVE',
        },
      },
    )
    const program = res.data?.createProgram?.program
    expect(program).toBeDefined()
    expect(program?.name).toBe('New Program')
  })

  test('should update a program', async () => {
    const res = await gql.send(
      graphql(`
        mutation ProgramResolverUpdateProgram($input: UpdateProgramInput!) {
          updateProgram(input: $input) {
            program {
              id
              name
            }
          }
        }
      `),
      {
        input: {
          id: programID,
          nameTr: [{ lang: 'en', text: 'Updated Program Name' }],
        },
      },
    )
    expect(res.data?.updateProgram?.program?.name).toBe('Updated Program Name')
  })

  test('should persist multi-locale social links and instructions, and resolve them per-locale', async () => {
    const createRes = await gql.send(
      graphql(`
        mutation ProgramResolverCreateProgramWithSocial($input: CreateProgramInput!) {
          createProgram(input: $input) {
            program {
              id
            }
          }
        }
      `),
      {
        input: {
          nameTr: [{ lang: 'en', text: 'Social Program' }],
          status: 'ACTIVE',
          social: {
            links: [
              { url: 'https://example.org', label: 'Website' },
              { url: 'https://example.org/sv', label: 'Webbplats', locale: 'sv' },
            ],
          },
          instructions: {
            primaryLinks: [
              { url: 'https://example.org/signup', label: 'Sign up', locale: 'en' },
              { url: 'https://example.org/anmal', label: 'Anmäl dig', locale: 'sv' },
            ],
          },
        },
      },
    )
    expect(createRes.errors).toBeUndefined()
    const socialProgramID = createRes.data!.createProgram!.program!.id

    const query = graphql(`
      query ProgramResolverGetSocialProgram($id: ID!) {
        program(id: $id) {
          id
          social {
            links {
              url
              label
              locale
            }
          }
          instructions {
            primaryLink {
              url
              label
              locale
            }
          }
        }
      }
    `)

    const enRes = await gql.send(query, { id: socialProgramID })
    expect(enRes.errors).toBeUndefined()
    expect(enRes.data?.program?.social?.links?.map((l) => l.url).sort()).toEqual([
      'https://example.org',
    ])
    expect(enRes.data?.program?.instructions?.primaryLink?.url).toBe('https://example.org/signup')

    gql.setLanguage('sv')
    try {
      const svRes = await gql.send(query, { id: socialProgramID })
      expect(svRes.errors).toBeUndefined()
      expect(svRes.data?.program?.social?.links?.map((l) => l.url).sort()).toEqual([
        'https://example.org',
        'https://example.org/sv',
      ])
      expect(svRes.data?.program?.instructions?.primaryLink?.url).toBe('https://example.org/anmal')
    } finally {
      gql.setLanguage('en')
    }
  })

  test('should keep currentProgram relation refs isolated while staging program relation changes', async () => {
    const baselineRes = await gql.send(
      graphql(`
        mutation ProgramResolverSetBaselineRelations($input: UpdateProgramInput!) {
          updateProgram(input: $input) {
            program {
              id
            }
          }
        }
      `),
      {
        input: {
          id: programID,
          region: REGION_IDS[0],
          orgs: [{ id: ORG_IDS[0], role: 'lead' }],
          processes: [{ id: PROCESS_IDS[0] }, { id: PROCESS_IDS[1] }],
          tags: [{ id: TAG_IDS[0], meta: { score: 10 } }],
        },
      },
    )
    expect(baselineRes.errors).toBeUndefined()

    const changeRes = await gql.send(
      graphql(`
        mutation ProgramResolverStageRelationChange($input: UpdateProgramInput!) {
          updateProgram(input: $input) {
            change {
              id
            }
            currentProgram {
              id
              region {
                id
              }
              orgs {
                nodes {
                  id
                }
              }
              processes {
                nodes {
                  id
                }
              }
              tags {
                nodes {
                  id
                }
              }
            }
          }
        }
      `),
      {
        input: {
          id: programID,
          region: REGION_IDS[1],
          addOrgs: [{ id: ORG_IDS[1], role: 'partner' }],
          removeOrgs: [ORG_IDS[0]],
          addProcesses: [{ id: PROCESS_IDS[2] }],
          removeProcesses: [PROCESS_IDS[0]],
          addTags: [{ id: TAG_IDS[3], meta: { level: 'high' } }],
          removeTags: [TAG_IDS[0]],
          change: { title: 'Program relation change', status: ChangeStatus.Draft },
        },
      },
    )
    expect(changeRes.errors).toBeUndefined()
    changeID = changeRes.data!.updateProgram!.change!.id

    expect(
      changeRes.data?.updateProgram?.currentProgram?.orgs?.nodes?.map((node) => node.id),
    ).toEqual([ORG_IDS[0]])
    expect(
      changeRes.data?.updateProgram?.currentProgram?.processes?.nodes
        ?.map((node) => node.id)
        .sort(),
    ).toEqual([PROCESS_IDS[0], PROCESS_IDS[1]].sort())
    expect(
      changeRes.data?.updateProgram?.currentProgram?.tags?.nodes?.map((node) => node.id),
    ).toEqual([TAG_IDS[0]])

    const em = orm.em.fork()
    const program = await em.findOne(Program, { id: programID } as any, {
      populate: ['region', 'programOrgs.org', 'programProcesses.process', 'programTags.tag'],
    })
    expect(program?.region?.id).toBe(REGION_IDS[0])
    expect(program?.programOrgs.getItems().map((row) => row.org.id)).toEqual([ORG_IDS[0]])
    expect(program?.programProcesses.getItems().map((row) => row.process.id)).toEqual([
      PROCESS_IDS[0],
      PROCESS_IDS[1],
    ])
    expect(program?.programTags.getItems().map((row) => row.tag.id)).toEqual([TAG_IDS[0]])
  })

  test('should merge staged program relation changes into the database', async () => {
    const approveRes = await gql.send(
      graphql(`
        mutation ProgramResolverApproveRelationChange($input: UpdateChangeInput!) {
          updateChange(input: $input) {
            change {
              status
            }
          }
        }
      `),
      { input: { id: changeID, status: ChangeStatus.Approved } },
    )
    expect(approveRes.errors).toBeUndefined()

    const mergeRes = await gql.send(
      graphql(`
        mutation ProgramResolverMergeRelationChange($id: ID!) {
          mergeChange(id: $id) {
            change {
              status
            }
          }
        }
      `),
      { id: changeID },
    )
    expect(mergeRes.errors).toBeUndefined()

    const programRes = await gql.send(
      graphql(`
        query ProgramResolverGetMergedRelations($id: ID!) {
          program(id: $id) {
            id
            region {
              id
            }
            orgs {
              nodes {
                id
              }
            }
            processes {
              nodes {
                id
              }
            }
            tags {
              nodes {
                id
              }
            }
          }
        }
      `),
      { id: programID },
    )
    expect(programRes.errors).toBeUndefined()
    expect(programRes.data?.program?.orgs?.nodes?.map((node) => node.id)).toEqual([ORG_IDS[1]])
    expect(programRes.data?.program?.processes?.nodes?.map((node) => node.id).sort()).toEqual(
      [PROCESS_IDS[1], PROCESS_IDS[2]].sort(),
    )
    expect(programRes.data?.program?.tags?.nodes?.map((node) => node.id)).toEqual([TAG_IDS[3]])

    const em = orm.em.fork()
    const mergedProgram = await em.findOne(Program, { id: programID } as any, {
      populate: ['region'],
    })
    expect(mergedProgram?.region?.id).toBe(REGION_IDS[1])

    const orgRows = await em.find(ProgramsOrgs, { program: programID } as any, {
      populate: ['org'],
      orderBy: { org: 'ASC' },
    })
    expect(orgRows.map((row) => row.org.id)).toEqual([ORG_IDS[1]])
    expect(orgRows[0]?.role).toBe('partner')

    const processRows = await em.find(ProgramsProcesses, { program: programID } as any, {
      populate: ['process'],
      orderBy: { process: 'ASC' },
    })
    expect(processRows.map((row) => row.process.id)).toEqual([PROCESS_IDS[1], PROCESS_IDS[2]])

    const tagRows = await em.find(ProgramsTags, { program: programID } as any, {
      populate: ['tag'],
      orderBy: { tag: 'ASC' },
    })
    expect(tagRows.map((row) => row.tag.id)).toEqual([TAG_IDS[3]])
    expect(tagRows[0]?.meta).toEqual({ level: 'high' })
  })
})
