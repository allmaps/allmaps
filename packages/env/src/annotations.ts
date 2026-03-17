import { z } from 'zod'

import { authApiEnvSchema } from './fragments.js'

export const annotationsEnvSchema = authApiEnvSchema

export type AnnotationsEnv = z.infer<typeof annotationsEnvSchema>

export function parseAnnotationsEnv(value: unknown): AnnotationsEnv {
  return annotationsEnvSchema.parse(value)
}
