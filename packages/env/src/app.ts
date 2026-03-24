import { z } from 'zod'

import { appEnvSchema, appPublicEnvSchema } from './fragments.js'
import { parseEnvSchema } from './shared.js'

export type AppEnv = z.infer<typeof appEnvSchema>
export type AppPublicEnv = z.infer<typeof appPublicEnvSchema>

export function parseAppEnv(value: unknown): AppEnv {
  return parseEnvSchema(appEnvSchema, value, 'app env vars')
}

export function parseAppPublicEnv(value: unknown): AppPublicEnv {
  return parseEnvSchema(appPublicEnvSchema, value, 'app public env vars')
}
