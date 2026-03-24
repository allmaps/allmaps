import { z } from 'zod'

import { apiEnvSchema } from './fragments.js'
import { parseEnvSchema } from './shared.js'

export const liveEnvSchema = apiEnvSchema

export type LiveEnv = z.infer<typeof liveEnvSchema>

export function parseLiveEnv(value: unknown): LiveEnv {
  return parseEnvSchema(liveEnvSchema, value, 'live env vars')
}
