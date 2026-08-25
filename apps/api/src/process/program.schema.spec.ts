import { BaseSchemaService } from '@src/common/base.schema'
import { ZService } from '@src/common/z.service'
import { ProgramOrgRole } from '@src/process/program.entity'
import { ProgramOrgsInputSchema, ProgramSchemaService } from '@src/process/program.schema'

describe('ProgramSchemaService', () => {
  let service: ProgramSchemaService

  beforeEach(() => {
    const mockI18n = { t: () => '' } as any
    const baseSchema = new BaseSchemaService(mockI18n)
    const zService = new ZService({ get: () => undefined } as any)
    service = new ProgramSchemaService(mockI18n, baseSchema, zService)
  })

  describe('parseCreateInput', () => {
    it('rejects when both name and nameTr are omitted', async () => {
      await expect(service.parseCreateInput({})).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['name'] })]),
      })
    })

    it('accepts name alone', async () => {
      await expect(service.parseCreateInput({ name: 'Recycling Program' })).resolves.toBeDefined()
    })

    it('accepts nameTr alone', async () => {
      await expect(
        service.parseCreateInput({ nameTr: [{ lang: 'en', text: 'Recycling Program' }] }),
      ).resolves.toBeDefined()
    })
  })

  describe('parseUpdateInput', () => {
    it('allows omitting both name and nameTr on update', async () => {
      await expect(service.parseUpdateInput({ id: 'program1' })).resolves.toBeDefined()
    })
  })
})

describe('ProgramOrgsInputSchema', () => {
  test('accepts a valid role unchanged', () => {
    const result = ProgramOrgsInputSchema.parse({ id: 'org-1', role: ProgramOrgRole.OPERATOR })
    expect(result.role).toBe(ProgramOrgRole.OPERATOR)
  })

  test('rejects an omitted role', () => {
    expect(() => ProgramOrgsInputSchema.parse({ id: 'org-1' })).toThrow()
  })

  test('falls back to OTHER for a legacy value that predates the enum', () => {
    const result = ProgramOrgsInputSchema.parse({ id: 'org-1', role: 'operator' })
    expect(result.role).toBe(ProgramOrgRole.OTHER)

    const result2 = ProgramOrgsInputSchema.parse({ id: 'org-1', role: 'supporter' })
    expect(result2.role).toBe(ProgramOrgRole.OTHER)
  })
})
