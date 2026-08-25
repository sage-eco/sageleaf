import { BaseSchemaService } from '@src/common/base.schema'
import { ZService } from '@src/common/z.service'
import { ComponentSchemaService } from '@src/process/component.schema'

const VALID_NANOID = 'V1StGXR8_Z5jdHi6B-myT'

describe('ComponentSchemaService', () => {
  let service: ComponentSchemaService

  beforeEach(() => {
    const mockI18n = { t: () => '' } as any
    const baseSchema = new BaseSchemaService(mockI18n)
    const zService = new ZService({ get: () => undefined } as any)
    service = new ComponentSchemaService(mockI18n, baseSchema, zService)
  })

  describe('parseCreateInput', () => {
    it('rejects when both name and nameTr are omitted', async () => {
      await expect(
        service.parseCreateInput({
          primaryMaterial: { id: 'mat1' },
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['name'] })]),
      })
    })

    it('accepts name alone', async () => {
      await expect(
        service.parseCreateInput({
          name: 'Aluminum Body',
          primaryMaterial: { id: 'mat1' },
        } as any),
      ).resolves.toBeDefined()
    })

    it('accepts nameTr alone', async () => {
      await expect(
        service.parseCreateInput({
          nameTr: [{ lang: 'en', text: 'Aluminum Body' }],
          primaryMaterial: { id: 'mat1' },
        } as any),
      ).resolves.toBeDefined()
    })

    it('rejects a missing primaryMaterial', async () => {
      await expect(
        service.parseCreateInput({ name: 'Aluminum Body' } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['primaryMaterial'] })]),
      })
    })

    it('accepts a valid full input', async () => {
      await expect(
        service.parseCreateInput({
          name: 'Aluminum Body',
          desc: 'Main body of the product',
          imageURL: 'https://example.com/component.png',
          primaryMaterial: { id: 'mat1', materialFraction: 0.8 },
          materials: [
            { id: 'mat1', materialFraction: 0.8 },
            { id: 'mat2', materialFraction: 0.2 },
          ],
          physical: {
            dimensions: { units: 'mm', width: 100, height: 200, depth: 10 },
            mass: { units: 'g', value: 500 },
          },
        } as any),
      ).resolves.toBeDefined()
    })

    it('rejects imageURL with http:// protocol', async () => {
      await expect(
        service.parseCreateInput({ imageURL: 'http://example.com/img.png' } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['imageURL'] })]),
      })
    })

    it('rejects imageURL with ftp:// protocol', async () => {
      await expect(
        service.parseCreateInput({ imageURL: 'ftp://example.com/img.png' } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['imageURL'] })]),
      })
    })

    it('rejects primaryMaterial with materialFraction above 1', async () => {
      await expect(
        service.parseCreateInput({
          primaryMaterial: { id: 'mat1', materialFraction: 1.1 },
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['primaryMaterial', 'materialFraction'] }),
        ]),
      })
    })

    it('rejects primaryMaterial with materialFraction below minimum (0.000001)', async () => {
      await expect(
        service.parseCreateInput({
          primaryMaterial: { id: 'mat1', materialFraction: 0.0000001 },
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['primaryMaterial', 'materialFraction'] }),
        ]),
      })
    })

    it('rejects primaryMaterial with materialFraction of 0', async () => {
      await expect(
        service.parseCreateInput({
          primaryMaterial: { id: 'mat1', materialFraction: 0 },
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['primaryMaterial', 'materialFraction'] }),
        ]),
      })
    })

    it('rejects materials array item with materialFraction above 1', async () => {
      await expect(
        service.parseCreateInput({
          materials: [{ id: 'mat1', materialFraction: 2.0 }],
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['materials', 0, 'materialFraction'] }),
        ]),
      })
    })

    it('rejects primaryMaterial with extra fields (strictObject)', async () => {
      await expect(
        service.parseCreateInput({
          primaryMaterial: { id: 'mat1', materialFraction: 0.5, unknownKey: true },
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: expect.arrayContaining(['primaryMaterial']) }),
        ]),
      })
    })

    it('rejects physical.dimensions with a non-numeric width', async () => {
      await expect(
        service.parseCreateInput({
          physical: { dimensions: { width: 'wide' } },
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['physical', 'dimensions', 'width'] }),
        ]),
      })
    })

    it('rejects physical.mass with a non-numeric value', async () => {
      await expect(
        service.parseCreateInput({
          physical: { mass: { value: 'heavy' } },
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['physical', 'mass', 'value'] }),
        ]),
      })
    })
  })

  describe('parseUpdateInput', () => {
    it('accepts a valid minimal update with only an id', async () => {
      await expect(service.parseUpdateInput({ id: 'comp1' } as any)).resolves.toBeDefined()
    })

    it('accepts a valid update with material changes', async () => {
      await expect(
        service.parseUpdateInput({
          id: 'comp1',
          name: 'Updated Component',
          materials: [{ id: 'mat2', materialFraction: 1.0 }],
          addTags: [{ id: 'tag1' }],
          removeTags: ['tag2'],
        } as any),
      ).resolves.toBeDefined()
    })

    it('rejects input with missing id', async () => {
      await expect(service.parseUpdateInput({} as any)).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['id'] })]),
      })
    })

    it('rejects materials with materialFraction above 1 on update', async () => {
      await expect(
        service.parseUpdateInput({
          id: 'comp1',
          materials: [{ id: 'mat1', materialFraction: 1.5 }],
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['materials', 0, 'materialFraction'] }),
        ]),
      })
    })

    it('rejects imageURL with http:// protocol on update', async () => {
      await expect(
        service.parseUpdateInput({ id: 'comp1', imageURL: 'http://example.com/img.png' } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['imageURL'] })]),
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
