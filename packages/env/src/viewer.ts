import { z } from 'zod'

import { appEnvSchema, appPublicEnvSchema } from './fragments.js'
import { parseEnvSchema } from './shared.js'

export const viewerEnvSchema = appEnvSchema
export const viewerPublicEnvSchema = appPublicEnvSchema

export type ViewerEnv = z.infer<typeof viewerEnvSchema>
export type ViewerPublicEnv = z.infer<typeof viewerPublicEnvSchema>

export function parseViewerEnv(value: unknown): ViewerEnv {
  return parseEnvSchema(viewerEnvSchema, value, 'viewer env vars')
}

export function parseViewerPublicEnv(value: unknown): ViewerPublicEnv {
  return parseEnvSchema(viewerPublicEnvSchema, value, 'viewer public env vars')
}
