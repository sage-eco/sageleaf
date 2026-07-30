import { ChangeStatus } from '@src/changes/change.entity'
import { ChangeSchemaService } from '@src/changes/change.schema'
import { ZService } from '@src/common/z.service'

const VALID_NANOID = 'V1StGXR8_Z5jdHi6B-myT'

describe('ChangeSchemaService', () => {
  let service: ChangeSchemaService

  beforeEach(() => {
    const zService = new ZService({ get: () => undefined } as any)
    service = new ChangeSchemaService(zService, {} as any)
  })

  describe('parseCreateInput', () => {
    it('accepts a valid empty input (all fields optional)', async () => {
      await expect(service.parseCreateInput({})).resolves.toBeDefined()
    })

    it('accepts a valid full input', async () => {
      await expect(
        service.parseCreateInput({
          title: 'My Change',
          description: 'A description of the change',
          status: ChangeStatus.DRAFT,
          sources: [VALID_NANOID],
        }),
      ).resolves.toBeDefined()
    })

    it('rejects an invalid status enum value', async () => {
      await expect(service.parseCreateInput({ status: 'PENDING' as any })).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['status'] })]),
      })
    })
  })

  describe('parseUpdateInput', () => {
    it('accepts a valid minimal update with only an id', async () => {
      await expect(service.parseUpdateInput({ id: VALID_NANOID })).resolves.toBeDefined()
    })

    it('accepts a valid full update', async () => {
      await expect(
        service.parseUpdateInput({
          id: VALID_NANOID,
          title: 'Updated Title',
          description: 'Updated description',
          status: ChangeStatus.APPROVED,
          sources: [VALID_NANOID],
        }),
      ).resolves.toBeDefined()
    })

    it('rejects input with missing id', async () => {
      await expect(service.parseUpdateInput({} as any)).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['id'] })]),
      })
    })

    it('rejects invalid status enum value on update', async () => {
      await expect(
        service.parseUpdateInput({ id: VALID_NANOID, status: 'INVALID_STATUS' as any }),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['status'] })]),
      })
    })
  })
})
