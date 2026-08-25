import { BaseSchemaService } from '@src/common/base.schema'
import { ZService } from '@src/common/z.service'
import { ProcessSchemaService } from '@src/process/process.schema'

const VALID_NANOID = 'V1StGXR8_Z5jdHi6B-myT'

describe('ProcessSchemaService', () => {
  let service: ProcessSchemaService

  beforeEach(() => {
    const mockI18n = { t: () => '' } as any
    const baseSchema = new BaseSchemaService(mockI18n)
    const zService = new ZService({ get: () => undefined } as any)
    service = new ProcessSchemaService(mockI18n, baseSchema, zService)
  })

  describe('parseCreateInput', () => {
    it('rejects when both name and nameTr are omitted', async () => {
      await expect(service.parseCreateInput({ intent: 'REUSE' } as any)).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['name'] })]),
      })
    })

    it('accepts name alone', async () => {
      await expect(
        service.parseCreateInput({ intent: 'REUSE', name: 'Plastic Recycling' } as any),
      ).resolves.toBeDefined()
    })

    it('accepts nameTr alone', async () => {
      await expect(
        service.parseCreateInput({
          intent: 'REUSE',
          nameTr: [{ lang: 'en', text: 'Plastic Recycling' }],
        } as any),
      ).resolves.toBeDefined()
    })

    it('accepts a valid minimal input with required intent', async () => {
      await expect(
        service.parseCreateInput({ intent: 'REUSE', name: 'Reuse Process' } as any),
      ).resolves.toBeDefined()
    })

    it('defaults instructions to {} when omitted', async () => {
      const result = await service.parseCreateInput({
        intent: 'REUSE',
        name: 'Reuse Process',
      } as any)
      expect(result.instructions).toEqual({})
    })

    it('accepts all valid ProcessIntent values', async () => {
      const intents = [
        'REUSE',
        'REPAIR',
        'REFURBISH',
        'REMANUFACTURE',
        'REPURPOSE',
        'RECYCLE',
        'ENERGY_RECOVERY',
        'LANDFILL',
        'LITTER',
      ] as const
      for (const intent of intents) {
        await expect(
          service.parseCreateInput({ intent, name: 'Process' } as any),
        ).resolves.toBeDefined()
      }
    })

    it('accepts a valid full input', async () => {
      await expect(
        service.parseCreateInput({
          intent: 'RECYCLE',
          name: 'Plastic Recycling',
          desc: 'Recycles various types of plastic',
          efficiency: { efficiency: 0.85, equivalency: 0.75, valueRatio: 0.5 },
          instructions: {
            container: { type: 'BIN', access: 'PUBLIC', color: 'yellow' },
          },
        } as any),
      ).resolves.toBeDefined()
    })

    it('rejects input with missing required intent', async () => {
      await expect(service.parseCreateInput({} as any)).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['intent'] })]),
      })
    })

    it('rejects an invalid intent enum value', async () => {
      await expect(service.parseCreateInput({ intent: 'DISPOSE' as any })).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['intent'] })]),
      })
    })

    it('rejects efficiency.efficiency value above 1', async () => {
      await expect(
        service.parseCreateInput({
          intent: 'RECYCLE',
          efficiency: { efficiency: 1.5 },
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['efficiency', 'efficiency'] }),
        ]),
      })
    })

    it('rejects efficiency.efficiency value below 0', async () => {
      await expect(
        service.parseCreateInput({
          intent: 'RECYCLE',
          efficiency: { efficiency: -0.1 },
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['efficiency', 'efficiency'] }),
        ]),
      })
    })

    it('rejects efficiency.equivalency value above 1', async () => {
      await expect(
        service.parseCreateInput({
          intent: 'RECYCLE',
          efficiency: { equivalency: 2.0 },
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['efficiency', 'equivalency'] }),
        ]),
      })
    })

    it('rejects efficiency.equivalency value below 0', async () => {
      await expect(
        service.parseCreateInput({
          intent: 'RECYCLE',
          efficiency: { equivalency: -0.5 },
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['efficiency', 'equivalency'] }),
        ]),
      })
    })

    it('rejects efficiency.valueRatio value below 0', async () => {
      await expect(
        service.parseCreateInput({
          intent: 'RECYCLE',
          efficiency: { valueRatio: -1 },
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['efficiency', 'valueRatio'] }),
        ]),
      })
    })

    it('rejects instructions.container with an invalid container type', async () => {
      await expect(
        service.parseCreateInput({
          intent: 'RECYCLE',
          instructions: { container: { type: 'BARREL' } },
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['instructions', 'container', 'type'] }),
        ]),
      })
    })

    it('rejects instructions.container with an invalid access value', async () => {
      await expect(
        service.parseCreateInput({
          intent: 'RECYCLE',
          instructions: { container: { type: 'BIN', access: 'UNKNOWN' } },
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['instructions', 'container', 'access'] }),
        ]),
      })
    })

    it('rejects instructions.container.imageEntryPoint with out-of-range x', async () => {
      await expect(
        service.parseCreateInput({
          intent: 'RECYCLE',
          instructions: {
            container: { type: 'BIN', imageEntryPoint: { x: 201, y: 50, side: 'left' } },
          },
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({
            path: ['instructions', 'container', 'imageEntryPoint', 'x'],
          }),
        ]),
      })
    })

    it('rejects instructions.container.imageEntryPoint with invalid side value', async () => {
      await expect(
        service.parseCreateInput({
          intent: 'RECYCLE',
          instructions: {
            container: { type: 'BIN', imageEntryPoint: { x: 50, y: 50, side: 'center' } },
          },
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({
            path: ['instructions', 'container', 'imageEntryPoint', 'side'],
          }),
        ]),
      })
    })
  })

  describe('parseUpdateInput', () => {
    it('accepts a valid minimal update with only an id', async () => {
      await expect(service.parseUpdateInput({ id: 'process1' } as any)).resolves.toBeDefined()
    })

    it('accepts a valid full update', async () => {
      await expect(
        service.parseUpdateInput({
          id: 'process1',
          intent: 'REPAIR',
          name: 'Updated Process',
          efficiency: { efficiency: 0.9, valueRatio: 1.2 },
        } as any),
      ).resolves.toBeDefined()
    })

    it('rejects input with missing id', async () => {
      await expect(service.parseUpdateInput({} as any)).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['id'] })]),
      })
    })

    it('rejects an invalid intent enum value on update', async () => {
      await expect(
        service.parseUpdateInput({ id: 'process1', intent: 'DUMP' as any }),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['intent'] })]),
      })
    })

    it('rejects efficiency.efficiency above 1 on update', async () => {
      await expect(
        service.parseUpdateInput({ id: 'process1', efficiency: { efficiency: 1.01 } } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['efficiency', 'efficiency'] }),
        ]),
      })
    })

    it('rejects efficiency.valueRatio below 0 on update', async () => {
      await expect(
        service.parseUpdateInput({ id: 'process1', efficiency: { valueRatio: -0.5 } } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['efficiency', 'valueRatio'] }),
        ]),
      })
    })
  })

  describe('parseDeleteInput', () => {
    it('accepts a valid delete input', async () => {
      await expect(service.parseDeleteInput({ id: VALID_NANOID })).resolves.toBeDefined()
    })

    it('rejects delete input with missing id', async () => {
      await expect(service.parseDeleteInput({} as any)).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['id'] })]),
      })
    })
  })
})
