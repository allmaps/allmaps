import { fetchWithPublicCache } from '@allmaps/api-shared/response-cache'
import { Elysia } from 'elysia'
import { CloudflareAdapter } from 'elysia/adapter/cloudflare-worker'
import { env as cfEnv } from 'cloudflare:workers'

import { getPgContext, type PgDb } from '@allmaps/db'
import { createAuth } from '@allmaps/db/auth'
import { createRequestDatabase } from '@allmaps/db/request'
import { parseRestEnv } from '@allmaps/env/rest'

import { createApp } from './app.js'
import { handleApiError } from './elysia.js'

const env = parseRestEnv(cfEnv)
const database = createRequestDatabase<PgDb>()
const betterAuth = createAuth(env, database.db)
// Elysia must compile at startup: Workers forbid runtime code generation.
const app = new Elysia({ adapter: CloudflareAdapter })
  .decorate('env', env)
  .derive(() => ({ db: database.db }))
  .onError(handleApiError)
  .use(createApp(env, betterAuth))
  .compile()

export default {
  async fetch(request, bindings, executionContext) {
    return fetchWithPublicCache(
      request,
      {
        cache: caches.default,
        namespace: 'rest-v2',
        waitUntil: (promise) => executionContext.waitUntil(promise)
      },
      async () => {
        const { db, close } = getPgContext(
          bindings.HYPERDRIVE.connectionString,
          { logger: env.LOG_QUERIES, maxConnections: 5 }
        )
        try {
          return await database.run(db, () => app.fetch(request))
        } finally {
          executionContext.waitUntil(
            close().catch(() => {
              console.warn('Failed to close Hyperdrive client')
            })
          )
        }
      }
    )
  }
} satisfies ExportedHandler<Env>
