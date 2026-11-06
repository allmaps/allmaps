import { PGlite } from '@electric-sql/pglite'
import { readdir } from 'node:fs/promises'
import { postgis } from '@electric-sql/pglite-postgis'
import { drizzle } from 'drizzle-orm/pglite'
import { createElysia } from '@allmaps/api-shared/elysia'
import { nodeAdapter } from './node-adapter.ts'

import { relations, getPgContext } from '@allmaps/db'
import type { Db } from '@allmaps/db'
import { createAuth } from '@allmaps/db/auth'
import { parseRestEnv } from '@allmaps/env/rest'
import { createApp as createRestApp } from '@allmaps/api-rest'
import { createApp as createAnnotationsApp } from '@allmaps/api-annotations'
import { AllmapsShareDB } from '@allmaps/api-live'

import { initializePglite, checkMigrations } from './migrations.ts'
import { seedDemoData, getSeedSummary } from '@allmaps/tools-seed'
import { loginSeedUser } from './local-auth.ts'

type ApiEnvironment = ReturnType<typeof parseRestEnv>

function createApps(db: Db, env: ApiEnvironment) {
  const betterAuth = createAuth(env, db)
  const rest = createElysia<ApiEnvironment>({ adapter: nodeAdapter() })
    .decorate('env', env)
    .decorate('db', db)
    .use(createRestApp(env, betterAuth))
  const annotations = createElysia<ApiEnvironment>({ adapter: nodeAdapter() })
    .decorate('env', env)
    .decorate('db', db)
    .use(createAnnotationsApp(env, betterAuth))
  return { betterAuth, rest, annotations }
}

async function closeShareDb(shareDb: AllmapsShareDB) {
  await shareDb.close()
  if (shareDb.persistErrors)
    throw new Error(
      'ShareDB reported persistence errors while closing the database'
    )
}

export async function createPgliteContext(options: {
  dataDir?: string
  seed?: 'demo'
  fixturePort?: number
  environment: Record<string, string | undefined>
  migrationsDirectory?: string
}) {
  if (options.dataDir && options.dataDir !== 'memory://') {
    const files: string[] = await readdir(options.dataDir).catch(
      (error: NodeJS.ErrnoException) => {
        if (error.code === 'ENOENT') return []
        throw error
      }
    )
    if (files.length && !files.includes('PG_VERSION'))
      throw new Error(
        'PGLITE_DATA_DIR must be empty or contain an existing PGlite database'
      )
  }
  const client = await PGlite.create({
    dataDir: options.dataDir,
    extensions: { postgis }
  })
  let shareDb: AllmapsShareDB | undefined

  try {
    const db = drizzle({ client, relations })
    await initializePglite(client, options.migrationsDirectory)

    const env = parseRestEnv(options.environment)
    const { betterAuth, rest, annotations } = createApps(db, env)
    shareDb = new AllmapsShareDB({ db })

    const seedCatalog =
      options.seed === 'demo'
        ? await seedDemoData({ client, db, shareDb }, options.fixturePort)
        : undefined

    if (seedCatalog) {
      rest
        .get('/__dev/seed', async () => ({
          ...seedCatalog,
          summary: await getSeedSummary(client, seedCatalog)
        }))
        .post('/__dev/login/:slug', async ({ params }) =>
          loginSeedUser(betterAuth, seedCatalog, params.slug)
        )
    }
    rest.compile()
    annotations.compile()

    const sharedDatabase = shareDb
    return {
      client,
      db,
      seedCatalog,
      env,
      betterAuth,
      shareDb: sharedDatabase,
      rest,
      annotations,
      async close() {
        try {
          await closeShareDb(sharedDatabase)
        } finally {
          await client.close()
        }
      }
    }
  } catch (error) {
    try {
      await shareDb?.close()
    } finally {
      await client.close()
    }
    throw error
  }
}

export type PgliteContext = Awaited<ReturnType<typeof createPgliteContext>>

export async function createPostgresContext(
  environment: Record<string, string | undefined>
) {
  const env = parseRestEnv(environment)
  if (!env.DATABASE_URL)
    throw new Error('DATABASE_URL is required for the PostgreSQL API runner')
  const { pool, db, close } = getPgContext(env.DATABASE_URL, {
    logger: env.LOG_QUERIES
  })
  let shareDb: AllmapsShareDB | undefined
  try {
    await checkMigrations({
      query: async (query, values) => (await pool.query(query, values)).rows
    })
    const apps = createApps(db, env)
    shareDb = new AllmapsShareDB({ db })
    const sharedDatabase = shareDb
    return {
      ...apps,
      env,
      shareDb: sharedDatabase,
      async close() {
        try {
          await closeShareDb(sharedDatabase)
        } finally {
          await close()
        }
      }
    }
  } catch (error) {
    try {
      await shareDb?.close()
    } finally {
      await close()
    }
    throw error
  }
}

export type RunningContext =
  PgliteContext | Awaited<ReturnType<typeof createPostgresContext>>
