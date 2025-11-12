import type { GeojsonPoint } from '@allmaps/types'

type GeocoderProviderGeoJsonFeatureProperties = {
  id: string
  label: string
  alt?: string
  url?: string
}

export type GeocoderProviderGeoJsonFeature = {
  geometry: GeojsonPoint
  properties: GeocoderProviderGeoJsonFeatureProperties
  bbox?: number[]
}

export type GeocoderGeoJsonFeature = {
  geometry: GeojsonPoint
  properties: {
    id: string
    provider: {
      id: string
      label: string
    }
    data: GeocoderProviderGeoJsonFeatureProperties & unknown
  }
  bbox?: number[]
}

export type GeocoderGeoJsonFeaturesByProvider = GeocoderGeoJsonFeature[][]
