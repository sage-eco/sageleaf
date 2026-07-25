import { vi } from 'vitest'

import { RedisService } from '@src/common/redis.service'
import { FeedbackAction, FeedbackEntityName } from '@src/feedback/feedback.entity'
import { VoteInput } from '@src/feedback/feedback.model'
import { FeedbackSchemaService } from '@src/feedback/feedback.schema'
import { FeedbackService } from '@src/feedback/feedback.service'

type FakeEm = {
  findOne: ReturnType<typeof vi.fn>
  execute: ReturnType<typeof vi.fn>
  getKnex: ReturnType<typeof vi.fn>
}

function makeEm(overrides: Partial<FakeEm> = {}): FakeEm {
  const knex = { raw: vi.fn().mockReturnValue({ toSQL: vi.fn() }) }
  return {
    findOne: vi.fn(),
    execute: vi.fn().mockResolvedValue(undefined),
    getKnex: vi.fn().mockReturnValue(knex),
    ...overrides,
  }
}

function makeRedis(overrides: Partial<{ get: any; set: any }> = {}) {
  return {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeSchemaService() {
  const svc = new FeedbackSchemaService()
  vi.spyOn(svc, 'getSchema')
  return svc
}

function makeService(emOverrides = {}, redisOverrides = {}) {
  const em = makeEm(emOverrides) as any
  const redis = makeRedis(redisOverrides) as unknown as RedisService
  const schema = makeSchemaService()
  return { service: new FeedbackService(em, redis, schema), em, redis, schema }
}

const FAKE_ENTITY = { id: 'ent1', updatedAt: new Date('2024-01-01') }

const baseInput: VoteInput = {
  entityName: FeedbackEntityName.ITEM,
  entityID: 'ent1',
  action: FeedbackAction.UPVOTE,
}

describe('FeedbackService', () => {
  describe('vote', () => {
    test('throws when entity is not found', async () => {
      const { service, em } = makeService()
      em.findOne.mockResolvedValue(null)
      await expect(service.vote(baseInput, '1.2.3.4')).rejects.toMatchObject({
        extensions: { code: 'NOT_FOUND' },
      })
    })

    test('no-op when same action is already in Redis', async () => {
      const { service, em, redis } = makeService(
        { findOne: vi.fn().mockResolvedValue(FAKE_ENTITY) },
        { get: vi.fn().mockResolvedValue(FeedbackAction.UPVOTE) },
      )
      const result = await service.vote(baseInput, '1.2.3.4')
      expect(result.success).toBe(true)
      expect(em.execute).not.toHaveBeenCalled()
      expect(redis.set).not.toHaveBeenCalled()
    })

    test('first vote: upserts vote row and sets Redis', async () => {
      const { service, em, redis } = makeService(
        { findOne: vi.fn().mockResolvedValue(FAKE_ENTITY) },
        { get: vi.fn().mockResolvedValue(null) },
      )
      const result = await service.vote(baseInput, '1.2.3.4')
      expect(result.success).toBe(true)
      expect(em.execute).toHaveBeenCalledOnce()
      const rawCall = em.getKnex().raw.mock.calls[0]
      expect(rawCall[0]).toMatch(/ON CONFLICT/)
      // params: [id, entityName, entityId, entityUpdatedAt, upvotesDelta=1, downvotesDelta=0, ...]
      expect(rawCall[1]).toContain(FeedbackEntityName.ITEM)
      expect(rawCall[1][4]).toBe(1) // upvotes delta for UPVOTE
      expect(rawCall[1][5]).toBe(0) // downvotes delta for UPVOTE
      expect(redis.set).toHaveBeenCalledWith(
        `fdbk:${FeedbackEntityName.ITEM}:ent1:1.2.3.4`,
        FeedbackAction.UPVOTE,
        86_400,
      )
    })

    test('vote switch: updates vote row and resets Redis', async () => {
      const { service, em, redis } = makeService(
        { findOne: vi.fn().mockResolvedValue(FAKE_ENTITY) },
        { get: vi.fn().mockResolvedValue(FeedbackAction.DOWNVOTE) },
      )
      const result = await service.vote(baseInput, '1.2.3.4')
      expect(result.success).toBe(true)
      expect(em.execute).toHaveBeenCalledOnce()
      const rawCall = em.getKnex().raw.mock.calls[0]
      expect(rawCall[0]).toMatch(/UPDATE feedback_votes/)
      expect(redis.set).toHaveBeenCalledWith(
        `fdbk:${FeedbackEntityName.ITEM}:ent1:1.2.3.4`,
        FeedbackAction.UPVOTE,
        86_400,
      )
    })

    test('upserts form when data is provided', async () => {
      const { service, em } = makeService(
        { findOne: vi.fn().mockResolvedValue(FAKE_ENTITY) },
        { get: vi.fn().mockResolvedValue(null) },
      )
      const input: VoteInput = { ...baseInput, data: { details: 'great!' } }
      await service.vote(input, '1.2.3.4')
      // two executes: vote upsert + form upsert
      expect(em.execute).toHaveBeenCalledTimes(2)
      const formRawCall = em.getKnex().raw.mock.calls[1]
      expect(formRawCall[0]).toMatch(/INSERT INTO feedback_forms/)
    })

    test('returns downvote schema when action is DOWNVOTE', async () => {
      const { service } = makeService(
        { findOne: vi.fn().mockResolvedValue(FAKE_ENTITY) },
        { get: vi.fn().mockResolvedValue(null) },
      )
      const result = await service.vote(
        { ...baseInput, action: FeedbackAction.DOWNVOTE },
        '1.2.3.4',
      )
      expect(result.schema).toBeDefined()
      expect(result.uischema).toBeDefined()
    })

    test('returns no schema when action is UPVOTE', async () => {
      const { service } = makeService(
        { findOne: vi.fn().mockResolvedValue(FAKE_ENTITY) },
        { get: vi.fn().mockResolvedValue(null) },
      )
      const result = await service.vote(baseInput, '1.2.3.4')
      expect(result.schema).toBeUndefined()
      expect(result.uischema).toBeUndefined()
    })

    test('uses x-forwarded-for first IP when multiple present', async () => {
      const { service, redis } = makeService(
        { findOne: vi.fn().mockResolvedValue(FAKE_ENTITY) },
        { get: vi.fn().mockResolvedValue(null) },
      )
      await service.vote(baseInput, '10.0.0.1')
      expect(redis.set).toHaveBeenCalledWith(
        expect.stringContaining('10.0.0.1'),
        expect.any(String),
        86_400,
      )
    })
  })
})
