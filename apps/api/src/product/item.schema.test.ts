import { BaseSchemaService } from '@src/common/base.schema'
import { ZService } from '@src/common/z.service'
import { ItemSchemaService } from '@src/product/item.schema'

const VALID_NANOID = 'V1StGXR8_Z5jdHi6B-myT'

describe('ItemSchemaService', () => {
  let service: ItemSchemaService

  beforeEach(() => {
    const mockI18n = { t: () => '' } as any
    const baseSchema = new BaseSchemaService(mockI18n)
    const zService = new ZService({ get: () => undefined } as any)
    service = new ItemSchemaService(mockI18n, baseSchema, zService)
  })

  describe('parseCreateInput', () => {
    it('rejects when both name and nameTr are omitted', async () => {
      await expect(service.parseCreateInput({} as any)).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['name'] })]),
      })
    })

    it('accepts name alone', async () => {
      await expect(service.parseCreateInput({ name: 'Laptop' } as any)).resolves.toBeDefined()
    })

    it('accepts nameTr alone', async () => {
      await expect(
        service.parseCreateInput({ nameTr: [{ lang: 'en', text: 'Laptop' }] } as any),
      ).resolves.toBeDefined()
    })

    it('accepts a valid full input', async () => {
      await expect(
        service.parseCreateInput({
          name: 'Laptop',
          desc: 'A portable computer',
          imageURL: 'https://example.com/laptop.png',
          categories: [{ id: 'cat1' }],
          tags: [{ id: 'tag1' }],
          nameTr: [{ lang: 'en', text: 'Laptop' }],
        } as any),
      ).resolves.toBeDefined()
    })

    it('accepts imageURL with icon:// protocol', async () => {
      await expect(
        service.parseCreateInput({ name: 'Laptop', imageURL: 'icon://laptop' } as any),
      ).resolves.toBeDefined()
    })

    it('rejects name that is an empty string (min length 1)', async () => {
      await expect(service.parseCreateInput({ name: '' } as any)).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['name'] })]),
      })
    })

    it('rejects imageURL with http:// protocol', async () => {
      await expect(
        service.parseCreateInput({ imageURL: 'http://example.com/image.png' } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['imageURL'] })]),
      })
    })

    it('rejects imageURL that is not a URL', async () => {
      await expect(
        service.parseCreateInput({ imageURL: 'plain-text-not-url' } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['imageURL'] })]),
      })
    })

    it('rejects categories where each item has unrecognized extra fields (strictObject)', async () => {
      await expect(
        service.parseCreateInput({
          categories: [{ id: 'cat1', unknownField: 'value' }],
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: expect.arrayContaining(['categories']) }),
        ]),
      })
    })

    it('rejects categories where id is missing', async () => {
      await expect(service.parseCreateInput({ categories: [{}] } as any)).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['categories', 0, 'id'] }),
        ]),
      })
    })

    it('rejects tags with extra fields not in strictObject schema', async () => {
      await expect(
        service.parseCreateInput({
          tags: [{ id: 'tag1', extraField: true }],
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: expect.arrayContaining(['tags']) }),
        ]),
      })
    })

    it('rejects nameTr with an invalid language code (too short)', async () => {
      await expect(
        service.parseCreateInput({ nameTr: [{ lang: 'x', text: 'Hello' }] } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: expect.arrayContaining(['nameTr']) }),
        ]),
      })
    })
  })

  describe('parseUpdateInput', () => {
    it('accepts a valid minimal update (name/nameTr may both be omitted)', async () => {
      await expect(service.parseUpdateInput({ id: 'some-item-id' } as any)).resolves.toBeDefined()
    })

    it('accepts a valid full update', async () => {
      await expect(
        service.parseUpdateInput({
          id: 'some-item-id',
          name: 'Updated Laptop',
          desc: 'Updated description',
          imageURL: 'https://example.com/new.png',
          categories: [{ id: 'cat2' }],
          addCategories: [{ id: 'cat3' }],
          removeCategories: ['cat1'],
        } as any),
      ).resolves.toBeDefined()
    })

    it('rejects input with missing id', async () => {
      await expect(service.parseUpdateInput({} as any)).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['id'] })]),
      })
    })

    it('rejects name that is an empty string on update (min length 1)', async () => {
      await expect(
        service.parseUpdateInput({ id: 'item1', name: '' } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['name'] })]),
      })
    })

    it('rejects imageURL with http:// protocol on update', async () => {
      await expect(
        service.parseUpdateInput({ id: 'item1', imageURL: 'http://example.com/img.png' } as any),
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
