import type { GcpTransformer } from '@allmaps/transform'

import { positionToGeoJsonPoint } from '$lib/shared/position.js'

export function toResourceCoordinates(
  transformer: GcpTransformer,
  position: GeolocationPosition
) {
  const geometry = positionToGeoJsonPoint(position)
  const resourceCoordinates = transformer.transformToResource(
    geometry.coordinates
  )
  return resourceCoordinates
}
