import { z } from 'zod'

import { authEnvSchema, databaseEnvSchema } from './fragments.js'

export const betterAuthEnvSchema = databaseEnvSchema.merge(authEnvSchema)

export type BetterAuthEnv = z.infer<typeof betterAuthEnvSchema>

export function parseBetterAuthEnv(value: unknown): BetterAuthEnv {
  return betterAuthEnvSchema.parse(value)
}
