import { z } from 'zod'

import { appEnvSchema, appPublicEnvSchema } from './fragments.js'
import { parseEnvSchema } from './shared.js'

export const consoleEnvSchema = appEnvSchema
export const consolePublicEnvSchema = appPublicEnvSchema

export type ConsoleEnv = z.infer<typeof consoleEnvSchema>
export type ConsolePublicEnv = z.infer<typeof consolePublicEnvSchema>

export function parseConsoleEnv(value: unknown): ConsoleEnv {
  return parseEnvSchema(consoleEnvSchema, value, 'console env vars')
}

export function parseConsolePublicEnv(value: unknown): ConsolePublicEnv {
  return parseEnvSchema(
    consolePublicEnvSchema,
    value,
    'console public env vars'
  )
}
