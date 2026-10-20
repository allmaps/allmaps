import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import type { Transaction } from '@electric-sql/pglite'
import { postgis } from '@electric-sql/pglite-postgis'
import { loadMigrations, migrationHistory } from '@allmaps/db/migrations'
import type { MigrationConnection } from '@allmaps/db/migrations'

export { loadMigrations, postgresMigrations } from '@allmaps/db/migrations'
export type { MigrationConnection } from '@allmaps/db/migrations'

export const migrations = loadMigrations()

export function pgliteMigrations(
  client: PGlite | Transaction
): MigrationConnection {
  return {
    query: async (sql, values) =>
      (await client.query<Record<string, unknown>>(sql, values)).rows
  }
}

export async function checkMigrations(
  connection: MigrationConnection,
  directory?: string
) {
  const { pending } = await migrationHistory(connection, directory)
  if (pending.length)
    throw new Error(
      'Database is missing local migrations. Stop the runner and use pnpm db:migrate --db=pglite for PGlite; migrate PostgreSQL through GitHub Actions.'
    )
}

async function applyMigrations(
  transaction: Transaction,
  pending: ReturnType<typeof loadMigrations>
) {
  for (const migration of pending) {
    // Existing seed SQL contains multiple statements per breakpoint chunk.
    await transaction.exec(migration.sql.join('\n'))
    await transaction.query(
      'INSERT INTO drizzle.__drizzle_migrations (hash, created_at, name) VALUES ($1, $2, $3)',
      [migration.hash, migration.folderMillis, migration.name]
    )
  }
}

export async function migratePglite(client: PGlite, directory?: string) {
  return client.transaction(async (transaction) => {
    const { pending, recorded } = await migrationHistory(
      pgliteMigrations(transaction),
      directory
    )
    if (!recorded)
      throw new Error(
        'PGlite has no migration history. Initialize an empty database with pnpm dev:apis --db=pglite first.'
      )
    if (pending.length) {
      // Older POC databases recorded hashes only. Add names for new entries
      // after validating the old history; never rewrite existing records.
      await transaction.exec(
        'ALTER TABLE drizzle.__drizzle_migrations ADD COLUMN IF NOT EXISTS name text'
      )
      await applyMigrations(transaction, pending)
    }
    return pending.map((migration) => migration.name!)
  })
}

export async function migratePgliteDirectory(
  dataDir: string,
  directory?: string
) {
  const version = await stat(join(dataDir, 'PG_VERSION')).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') return undefined
      throw error
    }
  )
  if (!version?.isFile())
    throw new Error(
      'No existing PGlite database in PGLITE_DATA_DIR. Initialize it with pnpm dev:apis --db=pglite first.'
    )
  const client = await PGlite.create({ dataDir, extensions: { postgis } })
  try {
    return await migratePglite(client, directory)
  } finally {
    await client.close()
  }
}

export async function initializePglite(client: PGlite, directory?: string) {
  // Only a database without user objects may be initialized. In particular, a
  // populated database without Drizzle metadata must never be treated as fresh.
  const { rows } = await client.query<{ initialized: boolean }>(`
    SELECT EXISTS (
      SELECT 1 FROM pg_namespace
      WHERE nspname NOT LIKE 'pg_%'
        AND nspname NOT IN ('public', 'information_schema')
      UNION ALL
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      UNION ALL
      SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
      UNION ALL
      SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE n.nspname = 'public'
    ) AS initialized
  `)
  if (rows[0].initialized) {
    await checkMigrations(pgliteMigrations(client), directory)
    return
  }
  const local = loadMigrations(directory)
  await client.transaction(async (transaction) => {
    await transaction.exec(`
      CREATE EXTENSION IF NOT EXISTS postgis;
      CREATE SCHEMA drizzle;
      CREATE TABLE drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint,
        name text, applied_at timestamp with time zone DEFAULT now()
      );
    `)
    await applyMigrations(transaction, local)
  })
}
