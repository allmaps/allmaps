import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseEnv } from 'node:util'

export const root = resolve(import.meta.dirname, '../../..')

export function loadLocalEnvironment(
  directory = root,
  overrides: Record<string, string | undefined> = process.env
) {
  const values = parseEnv(
    readFileSync(resolve(directory, '.env.localhost'), 'utf8')
  )
  const localPath = resolve(directory, '.env.localhost.local')
  if (existsSync(localPath))
    Object.assign(values, parseEnv(readFileSync(localPath, 'utf8')))
  return { ...values, ...overrides }
}

export function validateLocalEnvironment(
  values: Record<string, string | undefined>
) {
  for (const key of [
    'PUBLIC_REST_BASE_URL',
    'PUBLIC_ANNOTATIONS_BASE_URL',
    'PUBLIC_LIVE_BASE_URL'
  ]) {
    const value = values[key]
    const url = value && URL.canParse(value) ? new URL(value) : undefined
    if (
      !url ||
      url.protocol !== 'http:' ||
      !['localhost', '127.0.0.1'].includes(url.hostname) ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    ) {
      throw new Error(`${key} must be a localhost HTTP origin`)
    }
  }
}

export function postgresTarget(databaseUrl: string | undefined) {
  if (!databaseUrl)
    throw new Error(
      'Set DATABASE_URL for --db=postgres.\n' +
        'Run pnpm setup:env --db=postgres to enter a development database URL, ' +
        'generate an authentication secret, and optionally configure GitHub login.\n' +
        'It saves missing settings in .env.localhost.local and preserves existing settings. ' +
        'Then run pnpm dev:apis --db=postgres again.'
    )
  let url: URL
  try {
    url = new URL(databaseUrl)
  } catch {
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL')
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !url.hostname ||
    url.pathname.length < 2 ||
    url.hash
  )
    throw new Error(
      'DATABASE_URL must use postgres:// or postgresql:// and include a host and database'
    )
  // Never display credentials or query parameters (which can contain secrets).
  return { databaseUrl, label: `${url.host}${url.pathname}` }
}

export function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return message.replace(
    /postgres(?:ql)?:\/\/[^\s'"<>]+/gi,
    '[database connection]'
  )
}
