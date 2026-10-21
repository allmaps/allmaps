import { z } from 'zod'

import { authApiEnvSchema, liveImportEnvSchema } from './fragments.js'
import { parseEnvSchema } from './shared.js'

export const restEnvSchema = authApiEnvSchema.and(liveImportEnvSchema)

export type RestEnv = z.infer<typeof restEnvSchema>

export function parseRestEnv(value: unknown): RestEnv {
  return parseEnvSchema(restEnvSchema, value, 'rest env vars')
}
