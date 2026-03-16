import { loadEnvFile } from 'node:process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'drizzle-kit'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '../..')

loadEnvFile(resolve(root, '.env.localhost.local'))
loadEnvFile(resolve(root, '.env.localhost'))

// For drizzle-kit (studio, generate, migrate), prefer DIRECT_DATABASE_URL if set.
// Neon's pooler endpoint (-pooler in hostname) doesn't work well with drizzle-kit's
// postgres.js driver — use the direct connection endpoint instead.
// In .env.localhost.local, add:
//   DIRECT_DATABASE_URL=postgresql://<user>:<pass>@<host-without-pooler>/<db>?sslmode=require
const databaseUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error(
    'Missing DATABASE_URL. Make sure .env.localhost.local exists with DATABASE_URL set.'
  )
}

export default defineConfig({
  schema: './src/schema',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: databaseUrl
  }
})
