export function geolocationPositionToGeojsonFeature(
  geolocationPosition: GeolocationPosition
) {
  return {
    type: 'Feature' as const,
    geometry: {
      type: 'Point' as const,
      coordinates: [
        geolocationPosition.coords.longitude,
        geolocationPosition.coords.latitude
      ] as [number, number]
    },
    properties: {
      accuracy: geolocationPosition.coords.accuracy,
      altitude: geolocationPosition.coords.altitude,
      altitudeAccuracy: geolocationPosition.coords.altitudeAccuracy,
      heading: geolocationPosition.coords.heading,
      speed: geolocationPosition.coords.speed,
      timestamp: geolocationPosition.timestamp
    }
  }
}
