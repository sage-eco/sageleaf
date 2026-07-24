import Ajv2020 from 'ajv/dist/2020'
import { core, z } from 'zod/v4'
import { util } from 'zod/v4/core'

export const AjvTemplateSchema = new Ajv2020({
  allErrors: true,
  strict: false,
  useDefaults: true,
  removeAdditional: true,
})

export type JSONType = util.JSONType
export type JSONObject = { [key: string]: JSONType }
export const ZJSONObject = z.record(z.string(), z.json())
export const ZTranslatedField = z.record(z.string(), z.string())

export const RankSchema = z.object({
  llm: z.number().optional(),
  llm_hash: z.string().optional(),
  order: z.number().optional(),
  pop: z.number().optional(),
  qual: z.number().optional(),
})
export type Rank = z.infer<typeof RankSchema>

export const RANK_ORDER_SQL = `coalesce((rank ->> 'order')::double precision, 0.0)`

export const HTTPS_OR_ICON: core.$ZodURLParams = {
  protocol: /^https|icon$/,
}
