import { z } from 'zod'

import { appEnvSchema, appPublicEnvSchema } from './fragments.js'
import { parseEnvSchema } from './shared.js'

export const latestEnvSchema = appEnvSchema
export const latestPublicEnvSchema = appPublicEnvSchema

export type LatestEnv = z.infer<typeof latestEnvSchema>
export type LatestPublicEnv = z.infer<typeof latestPublicEnvSchema>

export function parseLatestEnv(value: unknown): LatestEnv {
  return parseEnvSchema(latestEnvSchema, value, 'latest env vars')
}
export function parseLatestPublicEnv(value: unknown): LatestPublicEnv {
  return parseEnvSchema(
    latestPublicEnvSchema,
    value,
    'latest public env vars'
  )
}
