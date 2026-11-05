import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrateDatabase } from './migrations.ts'

// Like migrate-ci.ts, but also initializes an empty database.

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('Missing DATABASE_URL')

const client = postgres(databaseUrl, { max: 1, onnotice: () => {} })

try {
  const [{ empty }] = await client`
    SELECT to_regclass('drizzle.__drizzle_migrations') IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
          -- Ignore extensions' objects, such as PostGIS's spatial_ref_sys and
          -- geometry_columns, so a pre-installed PostGIS still counts as empty
          AND NOT EXISTS (
            SELECT 1 FROM pg_depend d
            WHERE d.classid = 'pg_class'::regclass
              AND d.objid = c.oid
              AND d.deptype = 'e'
          )
      ) AS empty
  `
  if (empty) {
    await client.unsafe(`
      CREATE EXTENSION IF NOT EXISTS postgis;
      CREATE SCHEMA drizzle;
      CREATE TABLE drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint,
        name text, applied_at timestamp with time zone DEFAULT now()
      );
    `)
  }

  const applied = await migrateDatabase(drizzle({ client }))
  console.log(
    applied.length
      ? `Applied migrations:\n${applied.join('\n')}`
      : 'No pending migrations'
  )
} finally {
  await client.end({ timeout: 5 })
}
