import { z } from 'zod'

import { workerEnvSchema } from './fragments.js'

export const previewEnvSchema = workerEnvSchema

export type PreviewEnv = z.infer<typeof previewEnvSchema>

export function parsePreviewEnv(value: unknown): PreviewEnv {
  return previewEnvSchema.parse(value)
}
