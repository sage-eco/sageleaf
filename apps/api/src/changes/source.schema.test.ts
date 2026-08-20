import { SourceType } from '@src/changes/source.entity'
import { SourceSchemaService } from '@src/changes/source.schema'
import { ZService } from '@src/common/z.service'

const VALID_NANOID = 'V1StGXR8_Z5jdHi6B-myT'

describe('SourceSchemaService', () => {
  let service: SourceSchemaService

  beforeEach(() => {
    const zService = new ZService({ get: () => undefined } as any)
    service = new SourceSchemaService(zService)
  })

  describe('parseCreateInput', () => {
    it('accepts a valid input with a required type', async () => {
      await expect(service.parseCreateInput({ type: SourceType.API })).resolves.toBeDefined()
    })

    it('accepts all valid source types', async () => {
      const types = [
        SourceType.API,
        SourceType.TEXT,
        SourceType.IMAGE,
        SourceType.PDF,
        SourceType.URL,
        SourceType.FILE,
        SourceType.VIDEO,
        SourceType.OTHER,
      ] as const
      for (const type of types) {
        await expect(service.parseCreateInput({ type })).resolves.toBeDefined()
      }
    })

    it('accepts a valid full input', async () => {
      await expect(
        service.parseCreateInput({
          type: SourceType.URL,
          text: 'some extracted text',
          contentURL: 'https://example.com/data.json',
          metadata: { author: 'test' },
        }),
      ).resolves.toBeDefined()
    })

    it('rejects input with missing required type', async () => {
      await expect(service.parseCreateInput({} as any)).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['type'] })]),
      })
    })

    it('rejects an invalid source type enum value', async () => {
      await expect(service.parseCreateInput({ type: 'UNKNOWN' as any })).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['type'] })]),
      })
    })

    it('accepts contentURL with cdn:// protocol', async () => {
      await expect(
        service.parseCreateInput({
          type: SourceType.URL,
          contentURL: 'cdn://sources/test.jpg',
        }),
      ).resolves.toMatchObject({
        contentURL: 'cdn://sources/test.jpg',
      })
    })

    it('shrinks full CDN contentURL to cdn:// protocol', async () => {
      await expect(
        service.parseCreateInput({
          type: SourceType.URL,
          contentURL: 'https://sage-leaf-sources.fra1.cdn.digitaloceanspaces.com/test.jpg',
        }),
      ).resolves.toMatchObject({
        contentURL: 'cdn://sources/test.jpg',
      })
    })

    it('rejects contentURL with http:// instead of https://', async () => {
      await expect(
        service.parseCreateInput({
          type: SourceType.URL,
          contentURL: 'http://example.com/file.pdf',
        }),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['contentURL'] })]),
      })
    })

    it('rejects contentURL that is not a valid URL', async () => {
      await expect(
        service.parseCreateInput({ type: SourceType.URL, contentURL: 'not-a-url' }),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['contentURL'] })]),
      })
    })

    it('rejects contentURL with ftp:// protocol', async () => {
      await expect(
        service.parseCreateInput({ type: SourceType.URL, contentURL: 'ftp://example.com/file' }),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['contentURL'] })]),
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
          type: SourceType.PDF,
          text: 'updated extracted text',
          contentURL: 'https://example.com/content.pdf',
          metadata: { pages: 10 },
        }),
      ).resolves.toBeDefined()
    })

    it('rejects input with missing id', async () => {
      await expect(service.parseUpdateInput({} as any)).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['id'] })]),
      })
    })

    it('rejects invalid type enum on update', async () => {
      await expect(
        service.parseUpdateInput({ id: VALID_NANOID, type: 'DOCUMENT' as any }),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['type'] })]),
      })
    })

    it('rejects contentURL with non-https protocol on update', async () => {
      await expect(
        service.parseUpdateInput({ id: VALID_NANOID, contentURL: 'http://example.com' }),
      ).rejects.toMatchObject({
        issues: expect.arrayContaining([expect.objectContaining({ path: ['contentURL'] })]),
      })
    })
  })
})
