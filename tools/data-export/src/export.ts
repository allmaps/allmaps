import { join } from 'node:path'

import { fromDbRow } from '@allmaps/api-shared'

import { createDataExportWriters } from './writers.ts'
import { streamMaps } from './stream.ts'

import type { ApiMap, DbRow } from '@allmaps/api-shared/types'
import type { DataExportEnv } from '@allmaps/env/data-export'
import type { DataExportWriters } from './writers.ts'

const dataExportOrganizationPlans = new Set(['supporter', 'innovator'])

export async function exportData(env: DataExportEnv) {
  const writers = await createDataExportWriters({
    outputDirectory: env.DATA_EXPORT_OUTPUT_DIR
  })
  const organizationWriters = createOrganizationDataExportWriters({
    outputDirectory: env.DATA_EXPORT_OUTPUT_DIR
  })

  try {
    await streamMaps({
      batchSize: env.DATA_EXPORT_BATCH_SIZE,
      databaseUrl: env.DIRECT_DATABASE_URL ?? env.DATABASE_URL,
      async onRow(row) {
        try {
          const map = fromDbRow(row, env.ANNOTATIONS_BASE_URL)

          await writers.writeMap(map)

          const organizationSlug = getDataExportOrganizationSlug(row)
          if (organizationSlug) {
            await organizationWriters.writeMap(organizationSlug, map)
          }
        } catch (error) {
          throw new Error(`Unable to export map ${row.map.id}`, {
            cause: error
          })
        }
      }
    })
  } finally {
    await Promise.all([writers.close(), organizationWriters.close()])
  }
}

function createOrganizationDataExportWriters({
  outputDirectory
}: {
  outputDirectory: string
}) {
  const writersByOrganizationSlug = new Map<string, DataExportWriters>()

  return {
    async writeMap(organizationSlug: string, map: ApiMap) {
      let writers = writersByOrganizationSlug.get(organizationSlug)

      if (!writers) {
        writers = await createDataExportWriters({
          outputDirectory: join(
            outputDirectory,
            'organizations',
            organizationSlug
          ),
          includeDomainCounts: false
        })
        writersByOrganizationSlug.set(organizationSlug, writers)
      }

      await writers.writeMap(map)
    },
    async close() {
      await Promise.all(
        [...writersByOrganizationSlug.values()].map((writers) =>
          writers.close()
        )
      )
    }
  }
}

function getDataExportOrganizationSlug(row: DbRow) {
  const organization = row.image?.organizationUrl?.organization

  if (
    organization?.slug &&
    dataExportOrganizationPlans.has(organization.plan ?? '')
  ) {
    return organization.slug
  }
}
