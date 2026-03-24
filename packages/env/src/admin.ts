import { z } from 'zod'

import { appEnvSchema, appPublicEnvSchema } from './fragments.js'
import { parseEnvSchema } from './shared.js'

export const adminEnvSchema = appEnvSchema
export const adminPublicEnvSchema = appPublicEnvSchema

export type AdminEnv = z.infer<typeof adminEnvSchema>
export type AdminPublicEnv = z.infer<typeof adminPublicEnvSchema>

export function parseAdminEnv(value: unknown): AdminEnv {
  return parseEnvSchema(adminEnvSchema, value, 'admin env vars')
}

export function parseAdminPublicEnv(value: unknown): AdminPublicEnv {
  return parseEnvSchema(
    adminPublicEnvSchema,
    value,
    'admin public env vars'
  )
}
