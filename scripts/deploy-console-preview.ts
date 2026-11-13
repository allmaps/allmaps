import { spawnSync } from 'node:child_process'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseEnv } from 'node:util'

const target = process.argv[2]
if (!['console', 'rest'].includes(target ?? ''))
  throw new Error('Select console or rest preview')
const root = fileURLToPath(new URL('../', import.meta.url))
const branch =
  process.env.WORKERS_CI_BRANCH ||
  spawnSync('git', ['branch', '--show-current'], {
    cwd: root,
    encoding: 'utf8'
  }).stdout.trim()
if (branch !== 'feat/console-domain-statistics')
  throw new Error(
    'This preview deploy is restricted to the statistics feature branch'
  )
const previewName = process.env.PREVIEW_NAME ?? 'pr-766'
if (!/^pr-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(previewName))
  throw new Error('Preview name must be a DNS-safe PR identifier')
const consoleHost = `${previewName}.preview.console.allmaps.org`
const apiHost = `${previewName}.preview.api.allmaps.org`
const directory = target === 'console' ? 'apps/console' : 'apis/rest'
const cwd = join(root, directory)
const original = JSON.parse(await readFile(join(cwd, 'wrangler.jsonc'), 'utf8'))
const defaults = parseEnv(await readFile(join(root, '.env.dev'), 'utf8'))
const vars = Object.fromEntries(
  Object.entries(defaults).filter(
    ([key, value]) =>
      value &&
      (key.startsWith('PUBLIC_') ||
        [
          'NODE_VERSION',
          'SECURE',
          'LOG_QUERIES',
          'USE_CACHE',
          'BROWSER_CACHE_HOURS',
          'CLOUDFLARE_CACHE_HOURS'
        ].includes(key))
  )
)
vars.PUBLIC_REST_BASE_URL = `https://${apiHost}`
vars.PUBLIC_BANNER_TEXT = 'Statistics preview — isolated test database'
const config = {
  ...original,
  env: undefined,
  name: `${target}-preview`,
  vars,
  routes: [
    {
      pattern: target === 'console' ? consoleHost : apiHost,
      custom_domain: true
    }
  ],
  workers_dev: false,
  keep_vars: false
}
let secretFile: string | undefined
const temporary = await mkdtemp(join(tmpdir(), 'allmaps-console-preview-'))
const configFile = join(cwd, 'wrangler.preview.generated.json')
try {
  if (target === 'rest') {
    const proxy = process.env.OAUTH_PROXY_SECRET
    const main = process.env.PREVIEW_BETTER_AUTH_SECRET
    const hyperdrive = process.env.PREVIEW_HYPERDRIVE_ID
    if (
      !proxy ||
      !main ||
      proxy === main ||
      proxy.length < 32 ||
      main.length < 32
    )
      throw new Error('Configure distinct preview auth and proxy build secrets')
    if (hyperdrive !== 'd8a99a357ea94cc2969502c45028e1cd')
      throw new Error('Unexpected preview database binding')
    config.hyperdrive = [{ binding: 'HYPERDRIVE', id: hyperdrive }]
    Object.assign(vars, {
      BETTER_AUTH_URL: `https://${apiHost}`,
      BETTER_AUTH_COOKIE_PREFIX: 'allmaps-preview-statistics',
      OAUTH_PROXY_ENABLED: 'true',
      OAUTH_PROXY_URL: 'https://dev.api.allmaps.org',
      OAUTH_PROXY_ALLOWED_ORIGINS: `https://${apiHost},https://${consoleHost}`
    })
    // Client IDs are public. Discover the existing develop apps through their
    // ordinary authorization redirects without reading/copying provider secrets.
    let providers = 0
    for (const provider of ['github', 'google']) {
      const supplied = process.env[`${provider.toUpperCase()}_CLIENT_ID`]
      let clientId = supplied
      if (!clientId) {
        const response = await fetch(
          `https://dev.api.allmaps.org/login/${provider}`,
          { redirect: 'manual', signal: AbortSignal.timeout(15000) }
        )
        if (response.status === 404) continue
        const location = response.headers.get('location')
        if (response.status !== 302 || !location)
          throw new Error(`Develop ${provider} login is unavailable`)
        const url = new URL(location)
        const expectedHost =
          provider === 'github' ? 'github.com' : 'accounts.google.com'
        if (url.protocol !== 'https:' || url.hostname !== expectedHost)
          throw new Error('Unexpected provider authorization origin')
        clientId = url.searchParams.get('client_id') ?? undefined
      }
      if (!clientId)
        throw new Error('Provider did not expose a public client ID')
      vars[`${provider.toUpperCase()}_CLIENT_ID`] = clientId
      providers++
    }
    if (!providers) throw new Error('No develop sign-in provider is configured')
    secretFile = join(temporary, 'secrets.json')
    await writeFile(
      secretFile,
      JSON.stringify({ BETTER_AUTH_SECRET: main, OAUTH_PROXY_SECRET: proxy }),
      { mode: 0o600 }
    )
  }
  await writeFile(configFile, JSON.stringify(config, null, 2))
  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'wrangler',
      'deploy',
      '--env',
      '',
      '--config',
      configFile,
      ...(secretFile ? ['--secrets-file', secretFile] : [])
    ],
    { cwd, stdio: 'inherit' }
  )
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error('Preview deployment failed')
} finally {
  await rm(temporary, { recursive: true, force: true })
  await rm(configFile, { force: true })
}
