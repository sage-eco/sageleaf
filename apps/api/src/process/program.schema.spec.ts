import { ProgramOrgRole } from '@src/process/program.entity'
import { ProgramOrgsInputSchema } from '@src/process/program.schema'

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
