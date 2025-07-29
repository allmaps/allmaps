import { GeocoderProvider } from '../provider.js'

import type { GeojsonPoint, GeojsonGeometry } from '@allmaps/types'

import type { GeocoderProviderGeoJsonFeature } from '$lib/shared/types.js'

type GeoJsonFeatureWHGProperties = {
  title: string
  variants?: string[]
  ccodes?: string[]
}

type GeoJsonFeatureWHG = {
  geometry?: GeojsonGeometry
  properties: GeoJsonFeatureWHGProperties
}
// WHG returns GeoJSON Features, but not always points, and sometimes even without geometry.

export class WorldHistoricalGazetteer extends GeocoderProvider {
  constructor() {
    super('World Historical Gazetteer')
  }
  // Strangly WHG seems to crash for some common search terms
  // Example: https://whgazetteer.org/api/index/?name=London

  private getLabel(properties: GeoJsonFeatureWHGProperties) {
    if (properties.ccodes) {
      return properties.title + ', ' + properties.ccodes.join(', ')
    } else {
      return properties.title
    }
  }

  queryFunction(text: string) {
    return `https://whgazetteer.org/api/index/?name=${text}`
  }

  featuresFunction(features: unknown[]) {
    return (features as GeoJsonFeatureWHG[])
      .filter((feature) => feature.geometry?.type === 'Point')
      .map(({ geometry, properties }) => ({
        type: 'Feature',
        geometry: geometry as GeojsonPoint,
        properties: {
          label: this.getLabel(properties),
          alt: properties.variants?.join(', '),
          ...properties
        }
      })) as GeocoderProviderGeoJsonFeature[]
  }
}
