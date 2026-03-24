import { z } from 'zod'

import { authApiEnvSchema } from './fragments.js'
import { parseEnvSchema } from './shared.js'

export const annotationsEnvSchema = authApiEnvSchema

export type AnnotationsEnv = z.infer<typeof annotationsEnvSchema>

export function parseAnnotationsEnv(value: unknown): AnnotationsEnv {
  return parseEnvSchema(annotationsEnvSchema, value, 'annotations env vars')
}
