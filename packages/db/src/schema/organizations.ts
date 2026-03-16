import { text, pgTable, index } from 'drizzle-orm/pg-core'

import { defineRelationsPart } from 'drizzle-orm'

import { organizations } from './auth.js'

export const organizationUrls = pgTable(
  'organization_urls',
  {
    id: text('id').primaryKey(),
    organizationId: text('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    url: text('url').notNull().unique(),
    type: text('type', { enum: ['domain'] }).notNull()
  },
  (t) => [index().on(t.organizationId), index().on(t.url)]
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
