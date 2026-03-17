import { z } from 'zod'

import { appEnvSchema, appPublicEnvSchema } from './fragments.js'

export const latestEnvSchema = appEnvSchema
export const latestPublicEnvSchema = appPublicEnvSchema

export type LatestEnv = z.infer<typeof latestEnvSchema>
export type LatestPublicEnv = z.infer<typeof latestPublicEnvSchema>

export function parseLatestEnv(value: unknown): LatestEnv {
  return latestEnvSchema.parse(value)
}
export function parseLatestPublicEnv(value: unknown): LatestPublicEnv {
  return latestPublicEnvSchema.parse(value)
}
