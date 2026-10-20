import { createHash } from 'node:crypto'
import { validateLocalEnvironment, postgresTarget } from '@allmaps/tools-setup'

export function targetKey(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

export function apiEnvironment(
  source: Record<string, string | undefined>,
  database: 'pglite' | 'postgres',
  identity: string
) {
  const values = { ...source }
  validateLocalEnvironment(values)
  values.NODE_VERSION = process.versions.node.split('.')[0]
  values.BETTER_AUTH_URL = values.PUBLIC_REST_BASE_URL
  if (database === 'pglite') {
    values.DATABASE_URL = 'postgresql://localhost/pglite'
    values.BETTER_AUTH_SECRET ||= `allmaps-local-development-${targetKey(identity)}`
  } else {
    const target = postgresTarget(source.DATABASE_URL)
    values.DATABASE_URL = target.databaseUrl
    identity = target.databaseUrl
    if (!values.BETTER_AUTH_SECRET)
      throw new Error('Set BETTER_AUTH_SECRET for PostgreSQL')
  }
  values.BETTER_AUTH_COOKIE_PREFIX = `allmaps-local-${database}-${targetKey(identity)}`
  return values
}
