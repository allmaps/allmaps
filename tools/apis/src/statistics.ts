import { parseArgs } from 'node:util'
import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import { sql } from 'drizzle-orm'
import { getPostgresDb, getPostgresSql, relations } from '@allmaps/db'
import type { Db } from '@allmaps/db'
import {
  backfillDailyStatistics,
  refreshDailyStatistics
} from '@allmaps/api-shared/db'
import { safeError } from '@allmaps/tools-setup'

async function main() {
  // Credentials come from the existing environment, never arguments or logs.
  const { values } = parseArgs({
    options: {
      mode: { type: 'string' },
      from: { type: 'string' },
      through: { type: 'string' },
      db: { type: 'string', default: 'postgres' },
      'data-dir': { type: 'string' }
    }
  })
  if (!['backfill', 'refresh'].includes(values.mode ?? ''))
    throw new Error('Use --mode backfill or --mode refresh')
  if (!['postgres', 'pglite'].includes(values.db))
    throw new Error('Use --db postgres or --db pglite')
  if (values.mode === 'backfill' && (!values.from || !values.through))
    throw new Error(
      'Backfill requires --from and --through (inclusive UTC dates)'
    )
  if (values.mode === 'refresh' && values.through)
    throw new Error('Refresh records today; --through is only for backfill')
  let db: Db
  let close: () => Promise<void>
  if (values.db === 'pglite') {
    const dataDir = values['data-dir'] ?? process.env.PGLITE_DATA_DIR
    if (
      !dataDir ||
      !(await stat(join(dataDir, 'PG_VERSION')).catch(() => null))?.isFile()
    ) {
      throw new Error(
        'Select an existing PGlite database with --data-dir or PGLITE_DATA_DIR; stop the API runner first'
      )
    }
    const { PGlite } = await import('@electric-sql/pglite')
    const { postgis } = await import('@electric-sql/pglite-postgis')
    const { drizzle } = await import('drizzle-orm/pglite')
    const client = await PGlite.create({ dataDir, extensions: { postgis } })
    db = drizzle({ client, relations })
    close = () => client.close()
  } else {
    if (values['data-dir'])
      throw new Error('--data-dir is only supported with --db pglite')
    if (!process.env.DATABASE_URL)
      throw new Error('Set DATABASE_URL for the intended database')
    const client = getPostgresSql(process.env.DATABASE_URL)
    db = getPostgresDb(client)
    close = async () => {
      await client.end()
    }
  }
  try {
    const result = await db.execute(
      sql`SELECT to_regclass('statistics_daily') AS name`
    )
    const rows = 'rows' in result ? result.rows : result
    if (!(rows[0] as { name: string | null }).name)
      throw new Error(
        'Apply the daily statistics migration before running maintenance'
      )
    if (values.mode === 'backfill') {
      await db.transaction(async (tx) => {
        await tx.execute(sql`SELECT pg_advisory_xact_lock(173021, 1)`)
        await backfillDailyStatistics(tx, values.from!, values.through!)
      })
    } else await refreshDailyStatistics(db, values.from)
    console.info(`Statistics ${values.mode} completed`)
  } finally {
    await close()
  }
}
main().catch((error) => {
  console.error(safeError(error))
  process.exitCode = 1
})
