import { z } from 'zod'

import { authEnvSchema, databaseEnvSchema } from './fragments.js'
import { parseEnvSchema } from './shared.js'

export const betterAuthEnvSchema = databaseEnvSchema.merge(authEnvSchema)

export type BetterAuthEnv = z.infer<typeof betterAuthEnvSchema>

export function parseBetterAuthEnv(value: unknown): BetterAuthEnv {
  return parseEnvSchema(betterAuthEnvSchema, value, 'better-auth env vars')
}
