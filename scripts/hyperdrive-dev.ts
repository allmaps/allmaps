import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

import ports from '../ports.json' with { type: 'json' }

const api = process.argv[2]
if (api !== 'rest' && api !== 'annotations') {
  throw new Error('Expected API name: rest or annotations')
}
const root = new URL('../', import.meta.url)
const files = ['.env.localhost', '.env.localhost.local'].map((name) =>
  fileURLToPath(new URL(name, root))
)
const environment: Record<string, string> = {}
for (const path of files) {
  if (existsSync(path))
    Object.assign(environment, parseEnv(readFileSync(path, 'utf8')))
}
const variable = 'CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE'
const connectionString = process.env[variable] || environment.DATABASE_URL
if (!connectionString) {
  throw new Error(`Set DATABASE_URL in .env.localhost.local or ${variable}`)
}
// Pass credentials through the process environment, never CLI arguments or logs.
const result = spawnSync(
  'pnpm',
  [
    'exec',
    'wrangler',
    'dev',
    '--local',
    '--port',
    String(ports[api]),
    '--env',
    'dev',
    ...files.flatMap((path) => (existsSync(path) ? ['--env-file', path] : []))
  ],
  {
    cwd: fileURLToPath(new URL(`apis/${api}/`, root)),
    env: { ...process.env, [variable]: connectionString },
    stdio: 'inherit'
  }
)
process.exit(result.status ?? 1)
