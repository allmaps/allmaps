import { GeocoderProvider } from '../provider.js'

import type { GeojsonPoint } from '@allmaps/types'

import type { GeocoderProviderGeoJsonFeature } from '$lib/shared/geocoder/types.js'

type GeoJsonFeatureGeocodeEarth = {
  geometry: GeojsonPoint
  properties: { label: string }
}

export class GeocodeEarthGeocoderProvider extends GeocoderProvider {
  constructor(apiKey: string) {
    super('ge', 'Geocode.Earth', apiKey)
  }

  getFetchFeaturesUrl(text: string) {
    return (
      `https://api.geocode.earth/v1/autocomplete` +
      `?api_key=${this.apiKey}` +
      `&layers=-venue` +
      `&text=${text}`
    )
  }

  transformFeatures(features: unknown[]) {
    return features as GeoJsonFeatureGeocodeEarth[] as GeocoderProviderGeoJsonFeature[]
  }
}
