import GeocoderProvider from '../provider.js'

import type { GeojsonPoint, GeojsonGeometry } from '@allmaps/types'

import type { GeocoderGeoJsonFeature } from '$lib/shared/types.js'

type GeoJsonFeatureWHG = {
  geometry?: GeojsonGeometry
  properties: { title: string; variants?: string[]; ccodes?: string[] }
}
// WHG returns GeoJSON Features, but not always points, and sometimes even without geometry.

export default class WorldHistoricalGazetteer extends GeocoderProvider {
  constructor() {
    super('World Historical Gazetteer')
  }
  // Strangly WHG seems to crash for some common search terms
  // Example: https://whgazetteer.org/api/index/?name=London

  queryFunction = (text: string) =>
    `https://whgazetteer.org/api/index/?name=${text}`

  featuresFunction = (features: unknown[]) =>
    (features as GeoJsonFeatureWHG[])
      .filter((feature) => feature.geometry?.type == 'Point')
      .map(({ geometry, properties }) => ({
        geometry: geometry as GeojsonPoint,
        properties: {
          label: properties.title + ', ' + properties.ccodes?.join(', '),
          alt: properties.variants?.join(', '),
          ...properties
        }
      })) as GeocoderGeoJsonFeature[]
}
