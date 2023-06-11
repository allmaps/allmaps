export function positionToGeoJson(position: GeolocationPosition) {
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [position.coords.longitude, position.coords.latitude] as [
        number,
        number
      ]
    },
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
