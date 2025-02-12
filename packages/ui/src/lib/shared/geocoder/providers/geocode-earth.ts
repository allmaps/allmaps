import { GeocoderProvider } from '../provider.js'

import type { GeojsonPoint } from '@allmaps/types'

import type { GeocoderProviderGeoJsonFeature } from '$lib/shared/types.js'

type GeoJsonFeatureGE = {
  geometry: GeojsonPoint
  properties: { label: string }
}

export class GeocodeEarth extends GeocoderProvider {
  constructor(akiKey: string) {
    super('Geocode.Earth', akiKey)
  }

  queryFunction(text: string) {
    return (
      `https://api.geocode.earth/v1/autocomplete` +
      `?api_key=${this.apiKey}` +
      `&layers=-venue` +
      `&text=${text}`
    )
  }

  featuresFunction(features: unknown[]) {
    return features as GeoJsonFeatureGE[] as GeocoderProviderGeoJsonFeature[]
  }
}
