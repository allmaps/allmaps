import { fromDbRow } from '@allmaps/api-shared'

import { createDataExportWriters } from './writers.ts'
import { streamMaps } from './stream.ts'

import type { DataExportEnv } from '@allmaps/env/data-export'

export async function exportData(env: DataExportEnv) {
  const writers = await createDataExportWriters({
    outputDirectory: env.DATA_EXPORT_OUTPUT_DIR
  })

  try {
    await streamMaps({
      batchSize: env.DATA_EXPORT_BATCH_SIZE,
      databaseUrl: env.DIRECT_DATABASE_URL ?? env.DATABASE_URL,
      async onRow(row) {
        try {
          await writers.writeMap(fromDbRow(row, env.ANNOTATIONS_BASE_URL))
        } catch (error) {
          throw new Error(`Unable to export map ${row.map.id}`, {
            cause: error
          })
        }
      }
    })
  } finally {
    await writers.close()
  }
}
