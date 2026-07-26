import type { PluginTransformResultArgs, QueryId } from 'kysely'
import { describe, expect, it } from 'vitest'

import { DateCoercionKyselyPlugin } from '@src/auth/date-coercion-kysely.plugin'

describe('DateCoercionKyselyPlugin', () => {
  const plugin = new DateCoercionKyselyPlugin()

  function transformResult(rows: Record<string, unknown>[]) {
    const args: PluginTransformResultArgs = {
      queryId: {} as QueryId,
      result: { rows },
    }
    return plugin.transformResult(args)
  }

  it('coerces allowlisted date columns from raw Postgres strings to Date instances', async () => {
    const createdAt = '2024-01-15 10:30:00.123+00'
    const { rows } = await transformResult([
      { id: 'jwks-1', public_key: 'pub', private_key: 'priv', created_at: createdAt },
    ])

    expect(rows[0].created_at).toBeInstanceOf(Date)
    expect((rows[0].created_at as Date).getTime()).toBe(new Date(createdAt).getTime())
  })

  it('leaves non-allowlisted string fields untouched', async () => {
    const { rows } = await transformResult([
      { id: 'jwks-1', public_key: 'pub', created_at: '2024-01-15 10:30:00.123+00' },
    ])

    expect(rows[0].public_key).toBe('pub')
    expect(typeof rows[0].public_key).toBe('string')
  })

  it('passes null and undefined values through without throwing', async () => {
    const { rows } = await transformResult([
      { id: 'jwks-1', created_at: null, expires_at: undefined },
    ])

    expect(rows[0].created_at).toBeNull()
    expect(rows[0].expires_at).toBeUndefined()
  })

  it('passes through Date instances already coerced upstream', async () => {
    const date = new Date('2024-01-15T10:30:00.123Z')
    const { rows } = await transformResult([{ id: 'jwks-1', created_at: date }])

    expect(rows[0].created_at).toBe(date)
  })

  it('handles empty result sets', async () => {
    const result = await transformResult([])
    expect(result.rows).toEqual([])
  })
})
