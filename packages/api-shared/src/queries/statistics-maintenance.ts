import { sql } from 'drizzle-orm'
import type { Db, DbOrTx } from '@allmaps/db'

export function validateStatisticsRange(from: string, through: string) {
  for (const day of [from, through]) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
      !Number.isFinite(Date.parse(day)) ||
      new Date(day).toISOString().slice(0, 10) !== day
    ) {
      throw new Error('Use a valid date in YYYY-MM-DD format')
    }
  }
  if (from > through) throw new Error('Start date must not follow end date')
  if ((Date.parse(through) - Date.parse(from)) / 86400000 > 3660)
    throw new Error('Use a range of at most ten years')
}

// Scan source history once for the whole range. These are retained-record
// additions, not an authoritative audit of deleted or imported historical data.
export async function backfillDailyStatistics(
  db: DbOrTx,
  from: string,
  through: string
) {
  validateStatisticsRange(from, through)
  await db.execute(sql`
    WITH days AS (
      SELECT generate_series(${from}::date::timestamp, ${through}::date::timestamp, interval '1 day')::date AS day
    ), domains AS (
      SELECT coalesce(domain, '') AS domain FROM iiif.images
      UNION SELECT coalesce(domain, '') FROM iiif.manifests
      UNION SELECT domain FROM statistics_daily UNION SELECT ''
    ), image_activity AS (
      SELECT coalesce(domain, '') AS domain, (created_at AT TIME ZONE 'UTC')::date AS day, count(*) AS added
      FROM iiif.images WHERE (created_at AT TIME ZONE 'UTC')::date BETWEEN ${from}::date AND ${through}::date GROUP BY 1, 2
    ), manifest_activity AS (
      SELECT coalesce(domain, '') AS domain, (created_at AT TIME ZONE 'UTC')::date AS day, count(*) AS added
      FROM iiif.manifests WHERE (created_at AT TIME ZONE 'UTC')::date BETWEEN ${from}::date AND ${through}::date GROUP BY 1, 2
    ), map_facts AS MATERIALIZED (
      SELECT m.id, m.image_id, min(m.created_at) AS first_seen,
        min(m.created_at) FILTER (WHERE m.geo_mask IS NOT NULL) AS first_footprint
      FROM maps m GROUP BY m.id, m.image_id
    ), map_activity AS (
      SELECT coalesce(i.domain, '') AS domain, (m.first_seen AT TIME ZONE 'UTC')::date AS day, count(*) AS added
      FROM map_facts m JOIN iiif.images i ON i.id = m.image_id
      WHERE (m.first_seen AT TIME ZONE 'UTC')::date BETWEEN ${from}::date AND ${through}::date GROUP BY 1, 2
    ), image_first_footprint AS (
      SELECT image_id, min(first_footprint) AS first_footprint FROM map_facts GROUP BY image_id
    ), georeference_activity AS (
      SELECT coalesce(i.domain, '') AS domain, (g.first_footprint AT TIME ZONE 'UTC')::date AS day, count(*) AS added
      FROM image_first_footprint g JOIN iiif.images i ON i.id = g.image_id
      WHERE (g.first_footprint AT TIME ZONE 'UTC')::date BETWEEN ${from}::date AND ${through}::date GROUP BY 1, 2
    )
    INSERT INTO statistics_daily (domain, day, images_added, maps_added, manifests_added, images_first_georeferenced, activity_updated_at)
    SELECT d.domain, days.day, coalesce(i.added, 0), coalesce(m.added, 0), coalesce(f.added, 0), coalesce(g.added, 0), statement_timestamp()
    FROM domains d CROSS JOIN days
    LEFT JOIN image_activity i ON i.domain = d.domain AND i.day = days.day
    LEFT JOIN map_activity m ON m.domain = d.domain AND m.day = days.day
    LEFT JOIN manifest_activity f ON f.domain = d.domain AND f.day = days.day
    LEFT JOIN georeference_activity g ON g.domain = d.domain AND g.day = days.day
    ON CONFLICT (domain, day) DO UPDATE SET
      images_added = EXCLUDED.images_added, maps_added = EXCLUDED.maps_added,
      manifests_added = EXCLUDED.manifests_added, images_first_georeferenced = EXCLUDED.images_first_georeferenced,
      activity_updated_at = EXCLUDED.activity_updated_at
  `)
}

// An actual UTC-day sample, never today's stock relabeled as yesterday's.
// Run near the end of the UTC day for an end-of-day sample. Revisit yesterday's
// activity (or since the last run after an outage) to complete partial days.
export async function refreshDailyStatistics(db: Db, activityFrom?: string) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(173021, 1)`)
    const result = await tx.execute(
      sql`SELECT (statement_timestamp() AT TIME ZONE 'UTC')::date::text AS today, (SELECT max(day)::text FROM statistics_daily WHERE snapshot_at IS NOT NULL) AS last`
    )
    const rows = 'rows' in result ? result.rows : result
    const { today, last } = rows[0] as { today: string; last: string | null }
    const yesterday = new Date(Date.parse(today) - 86400000)
      .toISOString()
      .slice(0, 10)
    await backfillDailyStatistics(
      tx,
      activityFrom ?? (last && last < yesterday ? last : yesterday),
      today
    )
    const snapshot = await tx.execute(sql`
      WITH map_status AS (
        SELECT image_id, count(*) AS maps, bool_or(geo_mask IS NOT NULL) AS georeferenced
        FROM maps WHERE latest AND NOT archived GROUP BY image_id
      ), manifest_images AS (
        SELECT DISTINCT ci.image_id FROM iiif.canvases_images ci JOIN iiif.manifests_canvases mc ON mc.canvas_id = ci.canvas_id
      ), image_counts AS (
        SELECT coalesce(i.domain, '') AS domain, count(*) AS images, coalesce(sum(m.maps), 0) AS maps,
          count(*) FILTER (WHERE mi.image_id IS NULL) AS images_without_manifest,
          count(*) FILTER (WHERE coalesce(m.georeferenced, false)) AS georeferenced_images
        FROM iiif.images i LEFT JOIN map_status m ON m.image_id = i.id LEFT JOIN manifest_images mi ON mi.image_id = i.id
        WHERE NOT i.archived GROUP BY 1
      ), manifest_counts AS (
        SELECT coalesce(domain, '') AS domain, count(*) AS manifests FROM iiif.manifests GROUP BY 1
      ), domains AS (
        SELECT domain FROM image_counts UNION SELECT domain FROM manifest_counts
        UNION SELECT domain FROM statistics_daily UNION SELECT ''
      )
      INSERT INTO statistics_daily (domain, day, images, maps, manifests, images_without_manifest, georeferenced_images, snapshot_at)
      SELECT d.domain, (statement_timestamp() AT TIME ZONE 'UTC')::date, coalesce(i.images, 0), coalesce(i.maps, 0), coalesce(f.manifests, 0),
        coalesce(i.images_without_manifest, 0), coalesce(i.georeferenced_images, 0), statement_timestamp()
      FROM domains d LEFT JOIN image_counts i ON i.domain = d.domain LEFT JOIN manifest_counts f ON f.domain = d.domain
      ON CONFLICT (domain, day) DO UPDATE SET images = EXCLUDED.images, maps = EXCLUDED.maps,
        manifests = EXCLUDED.manifests, images_without_manifest = EXCLUDED.images_without_manifest,
        georeferenced_images = EXCLUDED.georeferenced_images, snapshot_at = EXCLUDED.snapshot_at
      RETURNING day::text
    `)
    const snapshotRows = 'rows' in snapshot ? snapshot.rows : snapshot
    const capturedDay = (snapshotRows[0] as { day: string }).day
    // A long activity backfill can cross midnight. Give the sample its real
    // date, then complete the activity rows for the newly entered day too.
    if (capturedDay !== today)
      await backfillDailyStatistics(tx, today, capturedDay)
  })
}
