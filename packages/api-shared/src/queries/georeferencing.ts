import { and, eq, not, sql } from 'drizzle-orm'

import { schema } from '@allmaps/db/schema'

import type { Db } from '@allmaps/db'

const mapSummary = {
  mapCount: sql<number>`count(distinct ${schema.maps.id})::int`,
  georeferencedMapCount: sql<number>`(
    count(distinct ${schema.maps.id})
    filter (where ${schema.maps.geoMask} is not null)
  )::int`,
  georeferencingUpdatedAt: sql<Date | null>`
    max(${schema.maps.updatedAt}) filter (where ${schema.maps.geoMask} is not null)
  `.mapWith(schema.maps.updatedAt)
}

export async function queryImageGeoreferencing(db: Db, imageId: string) {
  const { maps, images, imageAliases } = schema
  // Images registered before aliases use their own ID.
  const canonicalId = sql`coalesce((
    select ${imageAliases.canonicalImageId} from ${imageAliases}
    where ${imageAliases.imageId} = ${imageId}
  ), ${imageId}::text)`
  const activeImageId = db
    .select({ id: images.id })
    .from(images)
    .where(and(eq(images.id, canonicalId), not(images.archived)))

  const [summary] = await db
    .select(mapSummary)
    .from(maps)
    .where(
      and(eq(maps.imageId, activeImageId), maps.latest, not(maps.archived))
    )

  return {
    georeferenced: summary.georeferencedMapCount > 0,
    ...summary,
    georeferencingUpdatedAt:
      summary.georeferencingUpdatedAt?.toISOString() ?? null
  }
}

export async function queryManifestCoverage(db: Db, manifestId: string) {
  const { manifests, manifestsToCanvases, canvasesToImages, images, maps } =
    schema
  const [summary] = await db
    .select({
      ...mapSummary,
      canvasCount: sql<number>`count(distinct ${manifestsToCanvases.canvasId})::int`,
      georeferencedCanvasCount: sql<number>`(
        count(distinct ${manifestsToCanvases.canvasId})
        filter (where ${maps.geoMask} is not null)
      )::int`
    })
    .from(manifests)
    .leftJoin(
      manifestsToCanvases,
      eq(manifestsToCanvases.manifestId, manifests.id)
    )
    .leftJoin(
      canvasesToImages,
      eq(canvasesToImages.canvasId, manifestsToCanvases.canvasId)
    )
    .leftJoin(
      images,
      and(eq(images.id, canvasesToImages.imageId), eq(images.archived, false))
    )
    .leftJoin(
      maps,
      and(
        eq(maps.imageId, images.id),
        eq(maps.latest, true),
        eq(maps.archived, false)
      )
    )
    .where(eq(manifests.id, manifestId))
    .groupBy(manifests.id)

  if (!summary) {
    return {
      mapCount: 0,
      georeferencedMapCount: 0,
      georeferencingUpdatedAt: null,
      canvasCount: null,
      georeferencedCanvasCount: 0
    }
  }

  return {
    ...summary,
    georeferencingUpdatedAt:
      summary.georeferencingUpdatedAt?.toISOString() ?? null
  }
}
