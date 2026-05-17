import { text, pgTable, primaryKey, index } from 'drizzle-orm/pg-core'

import { defineRelationsPart } from 'drizzle-orm'

import { organizations } from './auth.js'

export const organizationUrls = pgTable(
  'organization_urls',
  {
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    url: text('url').notNull().unique(),
    type: text('type', { enum: ['domain'] }).notNull()
  },
  (table) => [
    primaryKey({ columns: [table.organizationId, table.url] }),
    index().on(table.organizationId),
    index().on(table.url)
  ]
)

export const organizationsRelationsPart = defineRelationsPart(
  { organizations, organizationUrls },
  (r) => ({
    organizations: {
      urls: r.many.organizationUrls({
        from: r.organizations.id,
        to: r.organizationUrls.organizationId
      })
    },
    organizationUrls: {
      organization: r.one.organizations({
        from: r.organizationUrls.organizationId,
        to: r.organizations.id
      })
    }
  })
)
