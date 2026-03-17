import { integer, pgTable, jsonb, text, primaryKey } from 'drizzle-orm/pg-core'

import { createTimestamp } from '../shared.js'

import type { DbMaps, Operation } from '../types.js'

export const ops = pgTable(
  'ops',
  {
    collection: text('collection').notNull(),
    docId: text('doc_id').notNull(),
    version: integer('version').notNull(),
    operation: jsonb('operation').notNull().$type<Operation>()
  },
  (table) => [
    primaryKey({ columns: [table.collection, table.docId, table.version] })
  ]
)

export const snapshots = pgTable(
  'snapshots',
  {
    collection: text('collection').notNull(),
    docId: text('doc_id').notNull(),
    docType: text('doc_type').notNull(),
    version: integer('version').notNull(),
    data: jsonb('data').notNull().$type<DbMaps>(),
    createdAt: createTimestamp('created_at'),
    updatedAt: createTimestamp('updated_at')
  },
  (table) => [primaryKey({ columns: [table.collection, table.docId] })]
)
