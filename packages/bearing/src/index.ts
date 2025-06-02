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
    // Not enough points for polynomial transformation
    throw new Error('Not enough GCPs to compute bearing')
  } else if (map.gcps.length === 2) {
    projectedTransformer = new ProjectedGcpTransformer(map.gcps, 'helmert')
  } else {
    // Using polynomial transformation, not map transformation type,
    // since faster when many gcps and accurate enough
    projectedTransformer = ProjectedGcpTransformer.fromGeoreferencedMap(map, {
      transformationType: 'polynomial',
      projection: lonLatProjection
    })
  }

  const bbox = computeBbox(map.resourceMask)

  const topLeft = projectedTransformer.transformToGeo([bbox[0], bbox[1]])
  const bottomLeft = projectedTransformer.transformToGeo([bbox[0], bbox[3]])

  return -bearing(bottomLeft, topLeft)
}
