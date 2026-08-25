import { BaseSchemaService } from '@src/common/base.schema'
import { ZService } from '@src/common/z.service'
import { VariantSchemaService } from '@src/product/variant.schema'

const VALID_NANOID = 'V1StGXR8_Z5jdHi6B-myT'

describe('VariantSchemaService', () => {
  let service: VariantSchemaService

  beforeEach(() => {
    const mockI18n = { t: () => '' } as any
    const baseSchema = new BaseSchemaService(mockI18n)
    const zService = new ZService({ get: () => undefined } as any)
    service = new VariantSchemaService(mockI18n, baseSchema, zService)
  })

  describe('parseCreateInput', () => {
    it('rejects when both name and nameTr are omitted', async () => {
      await expect(service.parseCreateInput({} as any)).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['name'] })]),
      })
    })

    it('accepts name alone', async () => {
      await expect(
        service.parseCreateInput({ name: 'Laptop Model X' } as any),
      ).resolves.toBeDefined()
    })

    it('accepts nameTr alone', async () => {
      await expect(
        service.parseCreateInput({ nameTr: [{ lang: 'en', text: 'Laptop Model X' }] } as any),
      ).resolves.toBeDefined()
    })

    it('accepts a valid full input', async () => {
      await expect(
        service.parseCreateInput({
          name: 'Laptop Model X',
          desc: 'High-performance laptop',
          imageURL: 'https://example.com/laptop.png',
          code: 'LPX-001',
          items: [{ id: 'item1' }],
          components: [{ id: 'comp1', quantity: 2, unit: 'g' }],
        } as any),
      ).resolves.toBeDefined()
    })

    it('rejects imageURL with http:// protocol', async () => {
      await expect(
        service.parseCreateInput({ imageURL: 'http://example.com/img.jpg' } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['imageURL'] })]),
      })
    })

    it('rejects imageURL that is not a URL at all', async () => {
      await expect(
        service.parseCreateInput({ imageURL: 'just-a-string' } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['imageURL'] })]),
      })
    })

    it('rejects component with negative quantity', async () => {
      await expect(
        service.parseCreateInput({ components: [{ id: 'comp1', quantity: -1 }] } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['components', 0, 'quantity'] }),
        ]),
      })
    })

    it('rejects component with invalid unit enum value', async () => {
      await expect(
        service.parseCreateInput({ components: [{ id: 'comp1', unit: 'kg' }] } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['components', 0, 'unit'] }),
        ]),
      })
    })

    it('rejects component missing required id field', async () => {
      await expect(
        service.parseCreateInput({ components: [{ quantity: 1 }] } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['components', 0, 'id'] }),
        ]),
      })
    })

    it('rejects component with extra fields (strictObject)', async () => {
      await expect(
        service.parseCreateInput({ components: [{ id: 'comp1', unknownField: 'value' }] } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: expect.arrayContaining(['components']) }),
        ]),
      })
    })
  })

  describe('parseUpdateInput', () => {
    it('accepts a valid minimal update (name/nameTr may both be omitted)', async () => {
      await expect(service.parseUpdateInput({ id: 'variant1' } as any)).resolves.toBeDefined()
    })

    it('accepts a valid full update', async () => {
      await expect(
        service.parseUpdateInput({
          id: 'variant1',
          name: 'Updated Laptop',
          code: 'LPX-002',
          addItems: [{ id: 'item2' }],
          removeItems: ['item1'],
          components: [{ id: 'comp1', quantity: 3, unit: 'ml' }],
          removeComponents: ['comp2'],
        } as any),
      ).resolves.toBeDefined()
    })

    it('rejects input with missing id', async () => {
      await expect(service.parseUpdateInput({} as any)).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['id'] })]),
      })
    })

    it('rejects addComponents with negative quantity', async () => {
      await expect(
        service.parseUpdateInput({
          id: 'var1',
          addComponents: [{ id: 'c1', quantity: -5 }],
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['addComponents', 0, 'quantity'] }),
        ]),
      })
    })

    it('rejects addComponents with invalid unit on update', async () => {
      await expect(
        service.parseUpdateInput({ id: 'var1', addComponents: [{ id: 'c1', unit: 'lb' }] } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['addComponents', 0, 'unit'] }),
        ]),
      })
    })

    it('rejects imageURL with http:// on update', async () => {
      await expect(
        service.parseUpdateInput({ id: 'var1', imageURL: 'http://example.com/img.png' } as any),
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
