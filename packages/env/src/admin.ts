import { z } from 'zod'

import { appEnvSchema, appPublicEnvSchema } from './fragments.js'

export const adminEnvSchema = appEnvSchema
export const adminPublicEnvSchema = appPublicEnvSchema

export type AdminEnv = z.infer<typeof adminEnvSchema>
export type AdminPublicEnv = z.infer<typeof adminPublicEnvSchema>

export function parseAdminEnv(value: unknown): AdminEnv {
  return adminEnvSchema.parse(value)
}

export function parseAdminPublicEnv(value: unknown): AdminPublicEnv {
  return adminPublicEnvSchema.parse(value)
}
