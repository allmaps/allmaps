import { z } from 'zod'

import { apiEnvSchema } from './fragments.js'

export const restEnvSchema = apiEnvSchema

export type RestEnv = z.infer<typeof restEnvSchema>

export function parseRestEnv(value: unknown): RestEnv {
  return restEnvSchema.parse(value)
}
