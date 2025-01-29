import bearing from '@turf/bearing'

import { GcpTransformer } from '@allmaps/transform'
import { computeBbox } from '@allmaps/stdlib'

import type { Map } from '@allmaps/annotation'

/**
 * Computes the bearing of a Georeferenced Map.
 *
 * @param map - Georeferenced Map
 * @returns The bearing of the map in degrees, measured from the north line
 */

export function computeGeoreferencedMapBearing(map: Map) {
  const transformer = new GcpTransformer(map.gcps)

  const bbox = computeBbox(map.resourceMask)

  const topLeft = transformer.transformToGeo([bbox[0], bbox[1]])
  const bottomLeft = transformer.transformToGeo([bbox[0], bbox[3]])

  return -bearing(bottomLeft, topLeft)
}
