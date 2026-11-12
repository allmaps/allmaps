import { sql } from 'drizzle-orm'
import type { Db } from '@allmaps/db'

// Read-only first version. Organization changes never trigger recomputation.
// Each resource is attributed to its own URI domain; related manifest lists
// may also contain manifests hosted on other domains.
export async function queryStatistics(db: Db, organizationId?: string) {
  const scope = (alias: string) =>
    organizationId === undefined
      ? sql`true`
      : sql`
    ${sql.identifier(alias)}.domain IN (
      SELECT url FROM organization_urls WHERE organization_id = ${organizationId} AND type = 'domain'
    )`
  const result = await db.execute(sql`
    WITH scoped_images AS (
      SELECT i.* FROM iiif.images i WHERE NOT i.archived AND ${scope('i')}
    ), current_maps AS (
      SELECT m.* FROM maps m JOIN scoped_images i ON i.id = m.image_id
      WHERE m.latest AND NOT m.archived
    )
    SELECT
      (SELECT count(*) FROM scoped_images) AS images,
      (SELECT count(*) FROM current_maps) AS maps,
      (SELECT count(*) FROM iiif.manifests f WHERE ${scope('f')}) AS manifests,
      (SELECT count(*) FROM scoped_images i WHERE NOT EXISTS (
        SELECT 1 FROM iiif.canvases_images ci
        JOIN iiif.manifests_canvases mc ON mc.canvas_id = ci.canvas_id
        WHERE ci.image_id = i.id
      )) AS images_without_manifest,
      (SELECT count(*) FROM scoped_images i WHERE EXISTS (
        SELECT 1 FROM current_maps m WHERE m.image_id = i.id AND m.geo_mask IS NOT NULL
      )) AS georeferenced_images
  `)
  // postgres-js returns an array; node-postgres and PGlite return { rows }.
  const rows = 'rows' in result ? result.rows : result
  const row = rows[0] as Record<string, unknown>
  const images = Number(row.images)
  const georeferencedImages = Number(row.georeferenced_images)
  return {
    images,
    maps: Number(row.maps),
    manifests: Number(row.manifests),
    imagesWithoutManifest: Number(row.images_without_manifest),
    georeferencedImages,
    georeferencedPercentage: images
      ? (100 * georeferencedImages) / images
      : null,
    measuredAt: new Date().toISOString()
  }
}
