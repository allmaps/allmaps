import { sql } from 'drizzle-orm'
import type { Db } from '@allmaps/db'
import { ResponseError } from '../shared/errors.js'
import { validateStatisticsRange } from './statistics-maintenance.js'

function domainScope(organizationId?: string) {
  return organizationId === undefined
    ? sql`true`
    : sql`domain IN (
    SELECT url FROM organization_urls WHERE organization_id = ${organizationId} AND type = 'domain'
  )`
}
const numeric = (value: unknown) => Number(value ?? 0)
const nullableNumeric = (value: unknown) =>
  value == null ? null : Number(value)
const timestamp = (value: unknown) =>
  value instanceof Date ? value.toISOString() : String(value)

// Reads only the small summary, never source records or historical map versions.
export async function queryStatistics(db: Db, organizationId?: string) {
  const result = await db.execute(sql`
    WITH latest AS (SELECT max(day) AS day FROM statistics_daily WHERE snapshot_at IS NOT NULL)
    SELECT sum(images) AS images, sum(maps) AS maps, sum(manifests) AS manifests,
      sum(images_without_manifest) AS images_without_manifest, sum(georeferenced_images) AS georeferenced_images,
      (SELECT max(snapshot_at) FROM statistics_daily WHERE day = (SELECT day FROM latest)) AS measured_at
    FROM statistics_daily WHERE day = (SELECT day FROM latest) AND ${domainScope(organizationId)}
  `)
  const rows = 'rows' in result ? result.rows : result
  const row = rows[0] as Record<string, unknown>
  if (!row.measured_at)
    throw new ResponseError('Daily statistics have not been generated yet', 503)
  const images = numeric(row.images)
  const georeferencedImages = numeric(row.georeferenced_images)
  return {
    images,
    maps: numeric(row.maps),
    manifests: numeric(row.manifests),
    imagesWithoutManifest: numeric(row.images_without_manifest),
    ungeoreferencedImages: images - georeferencedImages,
    georeferencedImages,
    georeferencedPercentage: images
      ? (100 * georeferencedImages) / images
      : null,
    measuredAt: timestamp(row.measured_at),
    source: 'daily' as const
  }
}

export type StatisticsInterval = 'day' | 'week' | 'month' | 'year'
export async function queryStatisticsHistory(
  db: Db,
  options: {
    from: string
    through: string
    interval: StatisticsInterval
    organizationId?: string
  }
) {
  try {
    validateStatisticsRange(options.from, options.through)
  } catch (error) {
    throw new ResponseError((error as Error).message, 400)
  }
  if (!['day', 'week', 'month', 'year'].includes(options.interval))
    throw new ResponseError('Invalid statistics interval', 400)
  const result = await db.execute(sql`
    WITH daily AS (
      SELECT day, sum(images_added) AS images_added, sum(maps_added) AS maps_added,
        sum(manifests_added) AS manifests_added, sum(images_first_georeferenced) AS images_first_georeferenced,
        sum(images) AS images, sum(maps) AS maps, sum(manifests) AS manifests,
        sum(images_without_manifest) AS images_without_manifest, sum(georeferenced_images) AS georeferenced_images,
        max(snapshot_at) AS snapshot_at
      FROM statistics_daily WHERE day >= ${options.from}::date AND day <= ${options.through}::date
        AND ${domainScope(options.organizationId)} GROUP BY day
    )
    SELECT date_trunc(${options.interval}, day::timestamp)::date::text AS period,
      sum(images_added) AS images_added, sum(maps_added) AS maps_added,
      sum(manifests_added) AS manifests_added, sum(images_first_georeferenced) AS images_first_georeferenced,
      (array_agg(images ORDER BY day DESC) FILTER (WHERE snapshot_at IS NOT NULL))[1] AS images,
      (array_agg(maps ORDER BY day DESC) FILTER (WHERE snapshot_at IS NOT NULL))[1] AS maps,
      (array_agg(manifests ORDER BY day DESC) FILTER (WHERE snapshot_at IS NOT NULL))[1] AS manifests,
      (array_agg(images_without_manifest ORDER BY day DESC) FILTER (WHERE snapshot_at IS NOT NULL))[1] AS images_without_manifest,
      (array_agg(georeferenced_images ORDER BY day DESC) FILTER (WHERE snapshot_at IS NOT NULL))[1] AS georeferenced_images,
      (array_agg(day::text ORDER BY day DESC) FILTER (WHERE snapshot_at IS NOT NULL))[1] AS stock_day,
      max(snapshot_at) AS measured_at, count(*) AS available_days
    FROM daily GROUP BY 1 ORDER BY 1
  `)
  const rows = 'rows' in result ? result.rows : result
  return {
    from: options.from,
    through: options.through,
    interval: options.interval,
    activityBasis: 'earliest-retained-records' as const,
    periods: rows.map((value) => {
      const row = value as Record<string, unknown>
      const images = nullableNumeric(row.images)
      const georeferencedImages = nullableNumeric(row.georeferenced_images)
      return {
        period: String(row.period),
        imagesAdded: numeric(row.images_added),
        mapsAdded: numeric(row.maps_added),
        manifestsAdded: numeric(row.manifests_added),
        imagesFirstGeoreferenced: numeric(row.images_first_georeferenced),
        images,
        maps: nullableNumeric(row.maps),
        manifests: nullableNumeric(row.manifests),
        imagesWithoutManifest: nullableNumeric(row.images_without_manifest),
        georeferencedImages,
        ungeoreferencedImages:
          images === null || georeferencedImages === null
            ? null
            : images - georeferencedImages,
        georeferencedPercentage:
          images && georeferencedImages !== null
            ? (100 * georeferencedImages) / images
            : null,
        stockDay: row.stock_day == null ? null : String(row.stock_day),
        measuredAt: row.measured_at == null ? null : timestamp(row.measured_at),
        availableDays: numeric(row.available_days)
      }
    })
  }
}

// Each domain belongs to at most one organization (organization_urls.url is unique).
// Include unassigned domains so these disjoint groups reconcile to global totals.
export async function queryStatisticsOrganizations(db: Db) {
  const result = await db.execute(sql`
    WITH latest AS (SELECT max(day) AS day FROM statistics_daily WHERE snapshot_at IS NOT NULL)
    SELECT o.id, o.name, sum(s.images) AS images, sum(s.maps) AS maps,
      sum(s.georeferenced_images) AS georeferenced_images,
      max(s.snapshot_at) AS measured_at
    FROM statistics_daily s
    LEFT JOIN organization_urls u ON u.url = s.domain AND u.type = 'domain'
    LEFT JOIN organizations o ON o.id = u.organization_id
    WHERE s.day = (SELECT day FROM latest)
    GROUP BY o.id, o.name
    ORDER BY sum(s.images) DESC, o.id
  `)
  const rows = 'rows' in result ? result.rows : result
  if (!rows.length)
    throw new ResponseError('Daily statistics have not been generated yet', 503)
  return {
    measuredAt: timestamp((rows[0] as Record<string, unknown>).measured_at),
    organizations: rows.map((value) => {
      const row = value as Record<string, unknown>
      return {
        id: row.id == null ? null : String(row.id),
        name: row.name == null ? 'Without organization' : String(row.name),
        images: numeric(row.images),
        maps: numeric(row.maps),
        georeferencedImages: numeric(row.georeferenced_images)
      }
    })
  }
}
