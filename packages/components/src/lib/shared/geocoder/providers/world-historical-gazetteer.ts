import { GeocoderProvider } from '../provider.js'

import type { GeojsonPoint, GeojsonGeometry } from '@allmaps/types'

import type { GeocoderProviderGeoJsonFeature } from '$lib/shared/geocoder/types.js'

type GeoJsonFeatureWorldHistoricalGazetteerProperties = {
  title: string
  index_id: string
  variants?: string[]
  ccodes?: string[]
}

type GeoJsonFeatureWorldHistoricalGazetteer = {
  geometry?: GeojsonGeometry
  properties: GeoJsonFeatureWorldHistoricalGazetteerProperties
}

export class WorldHistoricalGazetteerGeocoderProvider extends GeocoderProvider {
  constructor() {
    super('whg', 'World Historical Gazetteer')
  }

  private getLabel(
    properties: GeoJsonFeatureWorldHistoricalGazetteerProperties
  ) {
    if (properties.ccodes) {
      return properties.title + ', ' + properties.ccodes.join(', ')
    } else {
      return properties.title
    }
  }

  getFetchFeaturesUrl(text: string) {
    return `https://whgazetteer.org/api/index/?name=${text}`
  }

  transformFeatures(features: unknown[]) {
    return (
      (features as GeoJsonFeatureWorldHistoricalGazetteer[])
        // WHG returns GeoJSON Features, but not always points,
        // and sometimes without geometry.
        .filter((feature) => feature.geometry?.type == 'Point')
        .map(({ geometry, properties }) => ({
          type: 'Feature',
          geometry: geometry as GeojsonPoint,
          properties: {
            id: properties.index_id,
            label: this.getLabel(properties),
            alt: properties.variants?.join(', '),
            url: `https://whgazetteer.org/places/${properties.index_id}/portal`,
            ...properties
          }
        })) as GeocoderProviderGeoJsonFeature[]
    )
  }
}
