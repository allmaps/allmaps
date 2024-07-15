import type { GeojsonPoint } from '@allmaps/types'
import type { GeoJsonFeatureGeocoder } from '$lib/shared/types'
import GeocoderProvider from '../provider'

type GeoJsonFeatureGE = {
  geometry: GeojsonPoint
  properties: { label: string }
}
// properties.name: short location description
// properties.label: location description

export default class GeocodeEarth extends GeocoderProvider {
  constructor(akiKey: string) {
    super('Geocode.Earth', akiKey)
  }

  queryFunction = (text: string) =>
    `https://api.geocode.earth/v1/autocomplete` +
    `?api_key=${this.apiKey}` +
    `&text=${text}`

  featuresFunction = (features: unknown[]) =>
    features as GeoJsonFeatureGE[] as GeoJsonFeatureGeocoder[]
}