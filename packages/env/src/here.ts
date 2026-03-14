import { z } from 'zod'

import { appEnvSchema, appPublicEnvSchema } from './fragments.js'

export const hereEnvSchema = appEnvSchema
export const herePublicEnvSchema = appPublicEnvSchema

export type HereEnv = z.infer<typeof hereEnvSchema>
export type HerePublicEnv = z.infer<typeof herePublicEnvSchema>

export function parseHereEnv(value: unknown): HereEnv {
  return hereEnvSchema.parse(value)
}

export function parseHerePublicEnv(value: unknown): HerePublicEnv {
  return herePublicEnvSchema.parse(value)
}
