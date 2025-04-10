import bearing from '@turf/bearing'

import { GcpTransformer } from '@allmaps/transform'
import { computeBbox } from '@allmaps/stdlib'

import type { GeoreferencedMap } from '@allmaps/annotation'

/**
 * Computes the bearing of a Georeferenced Map.
 *
 * @param map - Georeferenced Map
 * @returns The bearing of the map in degrees, measured from the north line
 */

export function computeGeoreferencedMapBearing(map: GeoreferencedMap) {
  // Using polynomial transformation, not map transformation type, since faster and accurate enough
  const transformer = new GcpTransformer(map.gcps, 'polynomial')

  const bbox = computeBbox(map.resourceMask)

  const topLeft = transformer.transformToGeo([bbox[0], bbox[1]])
  const bottomLeft = transformer.transformToGeo([bbox[0], bbox[3]])

  return -bearing(bottomLeft, topLeft)
}
