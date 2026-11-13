import {
  bigint,
  date,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp
} from 'drizzle-orm/pg-core'

// Empty domain represents resources without a parsed URI domain. It contributes
// to global totals but is never assigned to an organization.
export const statisticsDaily = pgTable(
  'statistics_daily',
  {
    domain: text('domain').notNull(),
    day: date('day').notNull(),
    imagesAdded: bigint('images_added', { mode: 'number' })
      .notNull()
      .default(0),
    mapsAdded: bigint('maps_added', { mode: 'number' }).notNull().default(0),
    manifestsAdded: bigint('manifests_added', { mode: 'number' })
      .notNull()
      .default(0),
    imagesFirstGeoreferenced: bigint('images_first_georeferenced', {
      mode: 'number'
    })
      .notNull()
      .default(0),
    // Historical stock cannot be recovered reliably from retained versions.
    // Only an actual refresh supplies these fields; backfill leaves them null.
    images: bigint('images', { mode: 'number' }),
    maps: bigint('maps', { mode: 'number' }),
    manifests: bigint('manifests', { mode: 'number' }),
    imagesWithoutManifest: bigint('images_without_manifest', {
      mode: 'number'
    }),
    georeferencedImages: bigint('georeferenced_images', { mode: 'number' }),
    snapshotAt: timestamp('snapshot_at', { withTimezone: true }),
    activityUpdatedAt: timestamp('activity_updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
  },
  (table) => [
    primaryKey({ columns: [table.domain, table.day] }),
    index('statistics_daily_day_idx').on(table.day)
  ]
)
