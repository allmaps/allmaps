import { z } from 'zod'

import { databaseEnvSchema } from './fragments.js'
import { parseEnvSchema } from './shared.js'

export const dataExportEnvSchema = databaseEnvSchema.merge(
  z.object({
    ANNOTATIONS_BASE_URL: z
      .string()
      .url()
      .default('https://annotations.allmaps.org'),
    DATA_EXPORT_OUTPUT_DIR: z.string().min(1).default('./data'),
    DATA_EXPORT_BATCH_SIZE: z.coerce.number().int().positive().default(500),
    DATA_EXPORT_R2_DESTINATION: z.string().min(1).default('r2:allmaps-files')
  })
)

export type DataExportEnv = z.infer<typeof dataExportEnvSchema>

export function parseDataExportEnv(value: unknown): DataExportEnv {
  return parseEnvSchema(dataExportEnvSchema, value, 'data-export env vars')
}
