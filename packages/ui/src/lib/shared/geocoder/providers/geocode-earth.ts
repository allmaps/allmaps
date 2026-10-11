import { GeocoderProvider } from '../provider.js'

import type { GeojsonPoint } from '@allmaps/types'

import type { GeocoderProviderGeoJsonFeature } from '$lib/shared/geocoder/types.js'

type GeoJsonFeatureGeocodeEarth = {
  geometry: GeojsonPoint
  properties: { label: string }
}

export class GeocodeEarthGeocoderProvider extends GeocoderProvider {
  constructor(
    apiKey: string,
    private options: { includeVenues?: boolean } = {}
  ) {
    super('ge', 'Geocode.Earth', apiKey)
  }

  getFetchFeaturesUrl(text: string) {
    const params = new URLSearchParams({ api_key: this.apiKey!, text })
    if (!this.options.includeVenues) params.set('layers', '-venue')
    return `https://api.geocode.earth/v1/autocomplete?${params}`
  }

  transformFeatures(features: unknown[]) {
    return features as GeoJsonFeatureGeocodeEarth[] as GeocoderProviderGeoJsonFeature[]
  }
}
