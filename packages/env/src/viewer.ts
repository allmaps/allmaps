import { z } from 'zod'

import { appEnvSchema, appPublicEnvSchema } from './fragments.js'

export const viewerEnvSchema = appEnvSchema
export const viewerPublicEnvSchema = appPublicEnvSchema

export type ViewerEnv = z.infer<typeof viewerEnvSchema>
export type ViewerPublicEnv = z.infer<typeof viewerPublicEnvSchema>

export function parseViewerEnv(value: unknown): ViewerEnv {
  return viewerEnvSchema.parse(value)
}

export function parseViewerPublicEnv(value: unknown): ViewerPublicEnv {
  return viewerPublicEnvSchema.parse(value)
}
