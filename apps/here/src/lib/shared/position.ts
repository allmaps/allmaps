import turfDistance from '@turf/distance'

export function positionToGeoJsonPoint(position: GeolocationPosition) {
  return {
    type: 'Point' as const,
    coordinates: [position.coords.longitude, position.coords.latitude] as [
      number,
      number
    ]
  }
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

export function distance(
  position1: GeolocationPosition,
  position2: GeolocationPosition
) {
  return turfDistance(
    positionToGeoJsonPoint(position1),
    positionToGeoJsonPoint(position2),
    { units: 'meters' }
  )
}
