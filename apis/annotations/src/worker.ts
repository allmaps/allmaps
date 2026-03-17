import { Elysia } from 'elysia'
import { CloudflareAdapter } from 'elysia/adapter/cloudflare-worker'
import { env as cfEnv } from 'cloudflare:workers'

import { getNeonDb } from '@allmaps/db'
import { parseAnnotationsEnv } from '@allmaps/env/annotations'

import { app } from './app.js'
import { handleApiError } from './elysia.js'

console.log('📍 Allmaps Annotations API starting...')

const env = parseAnnotationsEnv(cfEnv)
console.log(env)
const elysia = new Elysia({
  adapter: CloudflareAdapter
})
  .decorate('env', env)
  .derive(() => ({ db: getNeonDb(env.DATABASE_URL, env.LOG_QUERIES) }))
  .onError(handleApiError)
  .use(app)
  // This is required to make Elysia work on Cloudflare Worker
  .compile()

export default {
  fetch: elysia.fetch.bind(elysia)
} satisfies ExportedHandler
