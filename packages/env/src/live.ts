import { z } from 'zod'

import { apiEnvSchema } from './fragments.js'

export const liveEnvSchema = apiEnvSchema

export type LiveEnv = z.infer<typeof liveEnvSchema>

export function parseLiveEnv(value: unknown): LiveEnv {
  return liveEnvSchema.parse(value)
}
