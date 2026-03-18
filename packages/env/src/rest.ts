import { z } from 'zod'

import { authApiEnvSchema } from './fragments.js'

export const restEnvSchema = authApiEnvSchema

export type RestEnv = z.infer<typeof restEnvSchema>

export function parseRestEnv(value: unknown): RestEnv {
  return restEnvSchema.parse(value)
}
