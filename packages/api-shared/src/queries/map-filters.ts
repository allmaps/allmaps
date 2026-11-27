import { sql } from 'drizzle-orm'
import type { schema } from '@allmaps/db/schema'
import type { MapsQueryParams } from '../types.js'

function spatialFilters(
  maps: typeof schema.maps,
  params: Partial<MapsQueryParams>
) {
  const predicates = []
  const { intersectsWith, containedBy } = params
  if (intersectsWith?.length === 2) {
    const [lat, lng] = intersectsWith
    predicates.push(
      sql`ST_Contains(${maps.geoMask}, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))`
    )
  } else if (intersectsWith?.length === 4) {
    const [south, west, north, east] = intersectsWith
    predicates.push(
      sql`ST_Intersects(${maps.geoMask}, ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326))`
    )
  }
  if (containedBy) {
    const [south, west, north, east] = containedBy
    predicates.push(
      sql`ST_Contains(ST_MakeEnvelope(${west}, ${south}, ${east}, ${north}, 4326), ${maps.geoMask})`
    )
  }
  return predicates.length ? sql.join(predicates, sql` AND `) : sql`TRUE`
}

export function mapFilters(params: Partial<MapsQueryParams>) {
  return {
    area: { lt: params.maxArea, gt: params.minArea },
    scale: { lt: params.maxScale, gt: params.minScale },
    updatedAt: { gte: params.modifiedAfter, lte: params.modifiedBefore },
    RAW: (maps: typeof schema.maps) => spatialFilters(maps, params)
  }
}

export function imageFilters(params: Partial<MapsQueryParams>) {
  return {
    domain: { eq: params.imageServiceDomain },
    canvases:
      params.canvasId || params.manifestId || params.manifestDomain
        ? {
            id: { eq: params.canvasId },
            manifests:
              params.manifestId || params.manifestDomain
                ? {
                    id: { eq: params.manifestId },
                    domain: { eq: params.manifestDomain }
                  }
                : undefined
          }
        : undefined
  }
}
