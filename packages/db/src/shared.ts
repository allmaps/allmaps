import { text, timestamp } from 'drizzle-orm/pg-core'

import { sql } from 'drizzle-orm'

import type { PgColumn } from 'drizzle-orm/pg-core'

export function createTimestamp(name: string) {
  return timestamp(name, { precision: 6, withTimezone: true })
    .defaultNow()
    .notNull()
}

export function createGeneratedDomain(
  uriColumn: () => PgColumn,
  name = 'domain'
) {
  return text(name).generatedAlwaysAs(
    () =>
      sql`((regexp_match(${uriColumn()}, '^(?:https?:\/\/)(?:[^@\/\n]+@)?([^:\/\n]+)'))[1])`
  )
}
