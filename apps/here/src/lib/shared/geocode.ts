const GEOCODE_FETCH_TIMEOUT = 2000

export async function reverseGeocodeLocality(
  [latitude, longitude]: [number, number],
  geocodeEathKey: string
) {
  if (!geocodeEathKey) {
    throw new Error('Geocode Earth API key is required')
  }

  const url = `https://api.geocode.earth/v1/reverse?layers=coarse&api_key=${geocodeEathKey}&point.lat=${latitude}&point.lon=${longitude}&lang=en-US`

  const reverseGeocode = (await fetch(url, {
    signal: AbortSignal.timeout(GEOCODE_FETCH_TIMEOUT)
  }).then((response) => response.json())) as unknown

  if (
    reverseGeocode &&
    typeof reverseGeocode === 'object' &&
    'features' in reverseGeocode &&
    Array.isArray(reverseGeocode.features) &&
    reverseGeocode.features.length > 0
  ) {
    const feature = reverseGeocode.features[0] as unknown

    if (
      feature &&
      typeof feature === 'object' &&
      'properties' in feature &&
      feature.properties &&
      typeof feature.properties === 'object' &&
      'locality' in feature.properties &&
      typeof feature.properties.locality === 'string'
    ) {
      return feature.properties.locality
    }
  }
}
