import { BaseSchemaService } from '@src/common/base.schema'
import { ZService } from '@src/common/z.service'
import { PlaceSchemaService } from '@src/geo/place.schema'

describe('PlaceSchemaService', () => {
  let service: PlaceSchemaService

  beforeEach(() => {
    const mockI18n = { t: () => '' } as any
    const baseSchema = new BaseSchemaService(mockI18n)
    const zService = new ZService({ get: () => undefined } as any)
    service = new PlaceSchemaService(mockI18n, baseSchema, zService)
  })

  describe('parseCreateInput', () => {
    it('rejects when both name and nameTr are omitted', async () => {
      await expect(
        service.parseCreateInput({
          location: { latitude: 59.3293, longitude: 18.0686 },
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['name'] })]),
      })
    })

    it('accepts name alone', async () => {
      await expect(
        service.parseCreateInput({
          name: 'Recycling Center',
          location: { latitude: 59.3293, longitude: 18.0686 },
        } as any),
      ).resolves.toBeDefined()
    })

    it('accepts nameTr alone', async () => {
      await expect(
        service.parseCreateInput({
          nameTr: [{ lang: 'en', text: 'Recycling Center' }],
          location: { latitude: 59.3293, longitude: 18.0686 },
        } as any),
      ).resolves.toBeDefined()
    })

    it('rejects a missing location', async () => {
      await expect(
        service.parseCreateInput({ name: 'Recycling Center' } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['location'] })]),
      })
    })

    it('accepts a valid full input', async () => {
      await expect(
        service.parseCreateInput({
          name: 'Recycling Center',
          desc: 'A local recycling facility',
          address: '123 Green Street, Stockholm',
          location: { latitude: 59.3293, longitude: 18.0686 },
          org: { id: 'org1' },
          tags: [{ id: 'tag1' }],
        } as any),
      ).resolves.toBeDefined()
    })

    it('rejects location with a non-numeric latitude', async () => {
      await expect(
        service.parseCreateInput({
          location: { latitude: 'not-a-number', longitude: 18.0 },
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['location', 'latitude'] }),
        ]),
      })
    })

    it('rejects location with a non-numeric longitude', async () => {
      await expect(
        service.parseCreateInput({
          location: { latitude: 59.3, longitude: 'east' },
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['location', 'longitude'] }),
        ]),
      })
    })

    it('rejects location missing latitude', async () => {
      await expect(
        service.parseCreateInput({ location: { longitude: 18.0 } } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['location', 'latitude'] }),
        ]),
      })
    })

    it('rejects location missing longitude', async () => {
      await expect(
        service.parseCreateInput({ location: { latitude: 59.3 } } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['location', 'longitude'] }),
        ]),
      })
    })

    it('rejects org with extra fields (strictObject)', async () => {
      await expect(
        service.parseCreateInput({ org: { id: 'org1', name: 'Extra field' } } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: expect.arrayContaining(['org']) }),
        ]),
      })
    })

    it('rejects tags item with extra fields (strictObject)', async () => {
      await expect(
        service.parseCreateInput({ tags: [{ id: 'tag1', extra: 'value' }] } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: expect.arrayContaining(['tags']) }),
        ]),
      })
    })

    it('rejects tags item missing required id', async () => {
      await expect(service.parseCreateInput({ tags: [{}] } as any)).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['tags', 0, 'id'] })]),
      })
    })
  })

  describe('parseUpdateInput', () => {
    it('accepts a valid minimal update with only an id', async () => {
      await expect(service.parseUpdateInput({ id: 'place1' } as any)).resolves.toBeDefined()
    })

    it('accepts a valid full update', async () => {
      await expect(
        service.parseUpdateInput({
          id: 'place1',
          name: 'Updated Recycling Center',
          address: '456 Eco Ave, Stockholm',
          location: { latitude: 59.34, longitude: 18.07 },
          addTags: [{ id: 'tag2' }],
          removeTags: ['tag1'],
        } as any),
      ).resolves.toBeDefined()
    })

    it('rejects input with missing id', async () => {
      await expect(service.parseUpdateInput({} as any)).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['id'] })]),
      })
    })

    it('rejects location with non-numeric latitude on update', async () => {
      await expect(
        service.parseUpdateInput({
          id: 'place1',
          location: { latitude: 'north', longitude: 18.0 },
        } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['location', 'latitude'] }),
        ]),
      })
    })

    it('rejects addTags item missing required id on update', async () => {
      await expect(
        service.parseUpdateInput({ id: 'place1', addTags: [{}] } as any),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['addTags', 0, 'id'] })]),
      })
    })
  })
})
