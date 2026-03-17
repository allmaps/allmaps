import { Elysia } from 'elysia'
import { CloudflareAdapter } from 'elysia/adapter/cloudflare-worker'
import { env as cfEnv } from 'cloudflare:workers'

import { createAuth, getNeonDb } from '@allmaps/db'
import { parseRestEnv } from '@allmaps/env/rest'

import { createApp } from './app.js'
import { handleApiError } from './elysia.js'

console.log('🗺️ Allmaps REST API starting...')

const env = parseRestEnv(cfEnv)
const betterAuth = createAuth(env)

const elysia = new Elysia({
  adapter: CloudflareAdapter
})
  .decorate('env', env)
  .derive(() => ({ db: getNeonDb(env.DATABASE_URL, env.LOG_QUERIES) }))
  .onError(handleApiError)
  .use(createApp(env, betterAuth))
  // This is required to make Elysia work on Cloudflare Worker
  .compile()

export default {
  fetch: elysia.fetch.bind(elysia)
} satisfies ExportedHandler
