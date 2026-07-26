import type {
  KyselyPlugin,
  PluginTransformQueryArgs,
  PluginTransformResultArgs,
  QueryResult,
  RootOperationNode,
  UnknownRow,
} from 'kysely'

/**
 * MikroORM installs custom `pg` type parsers on the shared connection that turn
 * timestamp/timestamptz/date/interval columns into raw strings (it does its own Date
 * hydration later in its entity-mapping layer). Better-auth's kysely adapter assumes the
 * driver already returns native `Date`s for postgres, so any date column read through this
 * shared connection needs to be coerced back explicitly.
 */
const DATE_COLUMNS = new Set([
  'created_at',
  'updated_at',
  'expires_at',
  'ban_expires',
  'access_token_expires_at',
  'refresh_token_expires_at',
  'last_refill_at',
  'last_request',
  'auth_time',
])

export class DateCoercionKyselyPlugin implements KyselyPlugin {
  transformQuery(args: PluginTransformQueryArgs): RootOperationNode {
    return args.node
  }

  async transformResult(args: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
    const { result } = args
    if (!result.rows?.length) return result

    return {
      ...result,
      rows: result.rows.map((row) => {
        const coerced: UnknownRow = { ...row }
        for (const column of DATE_COLUMNS) {
          const value = coerced[column]
          if (typeof value === 'string') {
            coerced[column] = new Date(value)
          }
        }
        return coerced
      }),
    }
  }
}
