import { z } from 'zod'

import { apiEnvSchema } from './fragments.js'

export const annotationsEnvSchema = apiEnvSchema

export type AnnotationsEnv = z.infer<typeof annotationsEnvSchema>

export function parseAnnotationsEnv(value: unknown): AnnotationsEnv {
  return annotationsEnvSchema.parse(value)
}
