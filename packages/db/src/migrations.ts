import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { readMigrationFiles } from 'drizzle-orm/migrator'
import { migrate } from 'drizzle-orm/pg-core'
import type { PgliteDatabase } from 'drizzle-orm/pglite'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { Sql } from 'postgres'

export const migrationsDirectory = fileURLToPath(
  new URL('../drizzle/', import.meta.url)
)

export function loadMigrations(directory = migrationsDirectory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^\d{14}_/.test(entry.name)) continue
    // Generation writes SQL and the snapshot separately. Never apply half a folder.
    JSON.parse(
      readFileSync(join(directory, entry.name, 'snapshot.json'), 'utf8')
    )
    if (!statSync(join(directory, entry.name, 'migration.sql')).isFile())
      throw new Error(`Missing migration SQL file: ${entry.name}`)
  }
  const migrations = readMigrationFiles({ migrationsFolder: directory })
  const timestamps = new Set<number>()
  for (const migration of migrations) {
    const timestamp = migration.name?.slice(0, 14)
    if (
      !migration.name?.match(/^\d{14}_.+/) ||
      !Number.isFinite(migration.folderMillis) ||
      new Date(migration.folderMillis)
        .toISOString()
        .replace(/\D/g, '')
        .slice(0, 14) !== timestamp ||
      timestamps.has(migration.folderMillis)
    ) {
      throw new Error(
        `Invalid or duplicate migration timestamp: ${migration.name}`
      )
    }
    timestamps.add(migration.folderMillis)
  }
  return migrations
}

export type MigrationConnection = {
  query: (sql: string, values?: unknown[]) => Promise<Record<string, unknown>[]>
}

export function postgresMigrations(client: Sql): MigrationConnection {
  return {
    query: async (sql, values = []) =>
      Array.from(await client.unsafe(sql, values as never[]))
  }
}

export async function migrationHistory(
  connection: MigrationConnection,
  directory?: string
) {
  const local = loadMigrations(directory)
  const [table] = await connection.query(
    "SELECT to_regclass('drizzle.__drizzle_migrations') AS name"
  )
  const applied = table.name
    ? await connection.query(
        'SELECT to_jsonb(m) AS migration FROM drizzle.__drizzle_migrations m ORDER BY id'
      )
    : []
  for (const [index, row] of applied.entries()) {
    const entry = row.migration as {
      id: unknown
      name?: string | null
      hash: string
      created_at?: number | string | null
    }
    // Legacy Drizzle timestamps can include milliseconds.
    const matches = (migration: (typeof local)[number]) =>
      migration.hash === entry.hash &&
      (entry.name
        ? migration.name === entry.name
        : migration.folderMillis ===
          Math.floor(Number(entry.created_at) / 1000) * 1000)
    if (local[index] && matches(local[index])) continue
    if (!local.some(matches))
      throw new Error(
        `Applied migration changed, missing, or duplicated: ${entry.name ?? entry.created_at ?? entry.id}`
      )
    throw new Error(
      'Migration history diverged: applied migrations are duplicated or out of order'
    )
  }
  return { pending: local.slice(applied.length), recorded: Boolean(table.name) }
}

export function ciDatabaseUrl(environment: NodeJS.ProcessEnv) {
  if (environment.CI !== 'true')
    throw new Error(
      'db:migrate:ci requires CI=true and an explicit DATABASE_URL'
    )
  let url: URL
  try {
    url = new URL(environment.DATABASE_URL ?? '')
  } catch {
    throw new Error('Set DATABASE_URL to a direct PostgreSQL connection URL')
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !url.hostname ||
    !url.username ||
    url.pathname.length < 2 ||
    url.hostname.includes('-pooler.')
  )
    throw new Error('Set DATABASE_URL to a direct PostgreSQL connection URL')
  return environment.DATABASE_URL!
}

export async function migrateDatabase(
  database: PostgresJsDatabase | PgliteDatabase,
  directory = migrationsDirectory
) {
  return database.transaction(async (transaction) => {
    const connection: MigrationConnection = {
      query: async (query) => {
        const result = await transaction.execute(sql.raw(query))
        return Array.isArray(result) ? result : result.rows
      }
    }
    // The lock and all migration work share a transaction and connection.
    // A disconnect aborts both; no migration can continue after losing its lock.
    const [lock] = await connection.query(
      'SELECT pg_try_advisory_xact_lock(1634495853, 1835624306) AS acquired'
    )
    if (!lock.acquired) throw new Error('Another Allmaps migration is running')
    // Validate history before Drizzle can upgrade legacy metadata.
    const { pending, recorded } = await migrationHistory(connection, directory)
    if (!recorded)
      throw new Error(
        'Database has no Drizzle migration history. Verify or initialize it before enabling CI releases.'
      )
    const [postgis] = await connection.query(
      "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS installed"
    )
    if (!postgis.installed)
      throw new Error('PostGIS must be installed before migrating')
    if (!pending.length) return []
    await migrate(loadMigrations(directory), transaction, {
      migrationsFolder: directory
    })
    const remaining = await migrationHistory(connection, directory)
    if (remaining.pending.length)
      throw new Error('Migration did not complete: pending migrations remain')
    return pending.map((migration) => migration.name!)
  })
}
