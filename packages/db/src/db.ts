import postgres from 'postgres'
import { drizzle as postgresDrizzle } from 'drizzle-orm/postgres-js'
import { Logger } from 'drizzle-orm/logger'

import { neon, neonConfig } from '@neondatabase/serverless'
import { drizzle as neonHttpDrizzle } from 'drizzle-orm/neon-http'
import { drizzle as neonServerlessDrizzle } from 'drizzle-orm/neon-serverless'

import { relations } from './schema.js'

class InterpolatedQueryLogger implements Logger {
  logQuery(query: string, params: unknown[]): void {
    const interpolated = query.replace(/\$(\d+)/g, (_, i) => {
      const value = params[Number(i) - 1]
      return typeof value === 'string' ? `'${value}'` : String(value)
    })
    console.log(interpolated)
  }
}

export function getNeonSql(databaseUrl: string) {
  return neon(databaseUrl)
}

export function getPostgresSql(databaseUrl: string) {
  return postgres(databaseUrl)
}

type PostgresSqlClient = ReturnType<typeof getPostgresSql>

export function getNeonHttpDb(databaseUrl: string, logger = false) {
  return neonHttpDrizzle(databaseUrl, {
    relations,
    logger: logger ? new InterpolatedQueryLogger() : undefined
  })
}

export function getNeonDb(databaseUrl: string, logger = false) {
  neonConfig.webSocketConstructor = WebSocket
  return neonServerlessDrizzle({
    connection: databaseUrl,
    relations,
    ws: WebSocket,
    logger: logger ? new InterpolatedQueryLogger() : undefined
  })
}

export function getPostgresDb(
  databaseUrlOrClient: string | PostgresSqlClient,
  logger = false
) {
  return postgresDrizzle({
    ...(typeof databaseUrlOrClient === 'string'
      ? { connection: databaseUrlOrClient }
      : { client: databaseUrlOrClient }),
    relations,
    logger: logger ? new InterpolatedQueryLogger() : undefined
  })
}

export function getPostgresContext(databaseUrl: string, logger = false) {
  const sql = getPostgresSql(databaseUrl)
  const db = getPostgresDb(sql, logger)

  return { sql, db }
}

export function getDb(databaseUrl: string, useNeon = false) {
  if (useNeon) {
    return getNeonDb(databaseUrl)
  } else {
    return getPostgresDb(databaseUrl)
  }
}

export type NeonDb = ReturnType<typeof getNeonDb>
export type NeonHttpDb = ReturnType<typeof getNeonHttpDb>
export type PostgresDb = ReturnType<typeof getPostgresDb>
export type PostgresContext = ReturnType<typeof getPostgresContext>
export type Db = PostgresDb | NeonHttpDb | NeonDb

export type DbTransaction =
  | Parameters<Parameters<PostgresDb['transaction']>[0]>[0]
  | Parameters<Parameters<NeonDb['transaction']>[0]>[0]
  | Parameters<Parameters<NeonHttpDb['transaction']>[0]>[0]

export type DbOrTx = Db | PostgresDb | DbTransaction
