import computeBearing from '@turf/bearing'

import { GcpTransformer } from '@allmaps/transform'

import { computeBbox } from './bbox.js'

import type { Map } from '@allmaps/annotation'

export function computeGeoreferencedMapBearing(map: Map) {
  // TODO: use transformation
  const transformer = new GcpTransformer(map.gcps)

  const bbox = computeBbox(map.resourceMask)

  const topLeft = transformer.transformToGeo([bbox[0], bbox[1]])
  const bottomLeft = transformer.transformToGeo([bbox[0], bbox[3]])

  return -computeBearing(bottomLeft, topLeft)
}
