import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Used by the trusted develop build before deploying the OAuth Proxy code.
// Secrets go through stdin, never CLI flags, generated source, or log output.
const secret = process.env.OAUTH_PROXY_SECRET
if (!secret || secret.length < 32)
  throw new Error('Set the dedicated OAUTH_PROXY_SECRET build secret')
const cwd = fileURLToPath(new URL('../apis/rest/', import.meta.url))
const configuration = JSON.parse(
  readFileSync(new URL('../apis/rest/wrangler.jsonc', import.meta.url), 'utf8')
)
if (configuration.env?.dev?.name !== 'rest-develop')
  throw new Error('Unexpected develop Worker target')
const result = spawnSync(
  'pnpm',
  ['exec', 'wrangler', 'secret', 'bulk', '--env', 'dev'],
  {
    cwd,
    input: JSON.stringify({ OAUTH_PROXY_SECRET: secret }),
    encoding: 'utf8',
    stdio: ['pipe', 'inherit', 'inherit']
  }
)
if (result.error) throw result.error
if (result.status !== 0)
  throw new Error('Could not provision the develop OAuth Proxy secret')
