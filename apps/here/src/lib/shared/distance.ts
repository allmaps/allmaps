import turfDistance from '@turf/distance'

import type { GeojsonPoint } from '@allmaps/types'

export function computeDistance(point1: GeojsonPoint, point2: GeojsonPoint) {
  return turfDistance(point1, point2, { units: 'meters' })
}

const numberFormat = new Intl.NumberFormat('en-US', {
  maximumSignificantDigits: 3
})

export function formatDistance(meters: number) {
  if (meters < 1000) {
    return `${meters.toFixed(0)} m`
  } else if (meters < 10000) {
    return `${(meters / 1000).toFixed(1)} km`
  }

  return `${numberFormat.format(meters / 1000)} km`
}
