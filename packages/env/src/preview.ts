import { z } from 'zod'

import { workerEnvSchema } from './fragments.js'
import { parseEnvSchema } from './shared.js'

export const previewEnvSchema = workerEnvSchema

export type PreviewEnv = z.infer<typeof previewEnvSchema>

export function parsePreviewEnv(value: unknown): PreviewEnv {
  return parseEnvSchema(previewEnvSchema, value, 'preview env vars')
}
