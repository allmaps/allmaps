import { computeDistance } from '$lib/shared/distance.js'
import { coordinatesToGeoJsonPoint } from '$lib/shared/geojson.js'

export function positionToGeoJsonPoint(position: GeolocationPosition) {
  return coordinatesToGeoJsonPoint([
    position.coords.longitude,
    position.coords.latitude
  ])
}

export function positionToGeoJsonFeature(position: GeolocationPosition) {
  return {
    type: 'Feature' as const,
    geometry: positionToGeoJsonPoint(position),
    properties: {
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp
    }
  }
}

export function computePositionDistance(
  position1: GeolocationPosition,
  position2: GeolocationPosition
) {
  return computeDistance(
    positionToGeoJsonPoint(position1),
    positionToGeoJsonPoint(position2)
  )
}
