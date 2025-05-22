import type { Point } from '@allmaps/types'

export function coordinatesToGeoJsonPoint(coordinates: Point) {
  return {
    type: 'Point' as const,
    coordinates
  }
}
