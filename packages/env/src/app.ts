import { z } from 'zod'

import { appEnvSchema, appPublicEnvSchema } from './fragments.js'

export type AppEnv = z.infer<typeof appEnvSchema>
export type AppPublicEnv = z.infer<typeof appPublicEnvSchema>

export function parseAppEnv(value: unknown): AppEnv {
  return appEnvSchema.parse(value)
}

export function parseAppPublicEnv(value: unknown): AppPublicEnv {
  return appPublicEnvSchema.parse(value)
}
