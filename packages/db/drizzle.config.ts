import { loadEnvFile } from 'node:process'
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'drizzle-kit'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '../..')

if (process.env.CI !== 'true') {
  for (const name of ['.env.localhost.local', '.env.localhost']) {
    const path = resolve(root, name)
    if (existsSync(path)) loadEnvFile(path)
  }
}

// Supply a direct connection as DATABASE_URL for administrative commands
// that require session-level database features.
const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error(
    'Missing DATABASE_URL. Set it explicitly in CI, or in .env.localhost.local for local commands.'
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
