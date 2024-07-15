import type { GeojsonPoint, GeojsonGeometry } from '@allmaps/types'
import type { GeoJsonFeatureGeocoder } from '$lib/shared/types'
import GeocoderProvider from '../provider'

type GeoJsonFeatureWHG = {
  geometry?: GeojsonGeometry
  properties: { title: string; variants?: string[]; ccodes?: string[] }
}
// WHG return 'GeoJSON features', but not necessarilly points, and sometimes without geometry.

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
      })) as GeoJsonFeatureGeocoder[]
}
