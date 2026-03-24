import { z } from 'zod'

import { authApiEnvSchema } from './fragments.js'
import { parseEnvSchema } from './shared.js'

export const restEnvSchema = authApiEnvSchema

export type RestEnv = z.infer<typeof restEnvSchema>

export function parseRestEnv(value: unknown): RestEnv {
  return parseEnvSchema(restEnvSchema, value, 'rest env vars')
}
