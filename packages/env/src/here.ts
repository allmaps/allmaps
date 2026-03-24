import { z } from 'zod'

import { appEnvSchema, appPublicEnvSchema } from './fragments.js'
import { parseEnvSchema } from './shared.js'

export const hereEnvSchema = appEnvSchema
export const herePublicEnvSchema = appPublicEnvSchema

export type HereEnv = z.infer<typeof hereEnvSchema>
export type HerePublicEnv = z.infer<typeof herePublicEnvSchema>

export function parseHereEnv(value: unknown): HereEnv {
  return parseEnvSchema(hereEnvSchema, value, 'here env vars')
}

export function parseHerePublicEnv(value: unknown): HerePublicEnv {
  return parseEnvSchema(herePublicEnvSchema, value, 'here public env vars')
}
