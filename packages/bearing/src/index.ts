import bearing from '@turf/bearing'

import { lonLatProjection, ProjectedGcpTransformer } from '@allmaps/project'
import { computeBbox } from '@allmaps/stdlib'

import type { GeoreferencedMap } from '@allmaps/annotation'

/**
 * Computes the bearing of a Georeferenced Map.
 *
 * @param map - Georeferenced Map
 * @returns The bearing of the map in degrees, measured from the north line
 */

export function computeGeoreferencedMapBearing(map: GeoreferencedMap) {
  let projectedTransformer: ProjectedGcpTransformer

  if (map.gcps.length < 2) {
    throw new Error('Not enough GCPs to compute bearing')
  } else {
    // Using helmert transformation, not map transformation type,
    // since possible for any amount of points, consistent,
    // faster when many gcps and accurate when showing original image
    projectedTransformer = ProjectedGcpTransformer.fromGeoreferencedMap(map, {
      transformationType: 'helmert',
      projection: lonLatProjection
    })
  }

  const bbox = computeBbox(map.resourceMask)

  const topLeft = projectedTransformer.transformToGeo([bbox[0], bbox[1]])
  const bottomLeft = projectedTransformer.transformToGeo([bbox[0], bbox[3]])

  return -bearing(bottomLeft, topLeft)
}
