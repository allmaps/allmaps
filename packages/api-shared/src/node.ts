import { node } from '@elysia/node'
import { WebStandardAdapter } from 'elysia/adapter/web-standard'

import { getPgContext } from '@allmaps/db'
import { createAuth } from '@allmaps/db/auth'
import type { BetterAuthContext } from '@allmaps/db/auth'
import type { AnyElysia } from 'elysia'

import { createElysia } from './elysia/app.js'
import { handleApiError } from './elysia/errors.js'

type ApiEnv = Omit<Parameters<typeof createAuth>[0], 'DATABASE_URL'> & {
  DATABASE_URL?: string
  LOG_QUERIES?: boolean
}

export function nodeAdapter() {
  // @elysia/node bundles an older response mapper that collapses multiple
  // Set-Cookie headers, so use Elysia's own.
  return { ...node(), handler: WebStandardAdapter.handler }
}

export function serveNode<TEnv extends ApiEnv>(
  env: TEnv,
  createApp: (env: TEnv, betterAuth: BetterAuthContext) => AnyElysia
) {
  const port = Number(process.env.PORT)
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('Missing or invalid PORT')
  }

  if (!env.DATABASE_URL) {
    throw new Error('Missing DATABASE_URL')
  }

  const { db } = getPgContext(env.DATABASE_URL, { logger: env.LOG_QUERIES })

  createElysia<TEnv>({ adapter: nodeAdapter() })
    .decorate('env', env)
    .decorate('db', db)
    .onError(handleApiError)
    .use(createApp(env, createAuth(env, db)))
    .listen({ port, hostname: '0.0.0.0' })
}
