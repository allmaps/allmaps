import type {
  GeocoderGeoJsonFeature,
  GeocoderProviderGeoJsonFeature
} from '$lib/shared/geocoder/types.js'

export abstract class GeocoderProvider {
  id: string
  label: string
  apiKey?: string

  controller?: AbortController

  abstract getFetchFeaturesUrl(text: string): string
  abstract transformFeatures(
    features: unknown[]
  ): GeocoderProviderGeoJsonFeature[]

  constructor(id: string, label: string, apiKey?: string) {
    this.id = id
    this.label = label
    this.apiKey = apiKey
  }

  async fetchFeatures(input: string): Promise<GeocoderGeoJsonFeature[]> {
    if (this.controller) {
      this.controller.abort()
    }
    this.controller = new AbortController()
    const signal = this.controller.signal

    if (input === '') {
      return []
    }

    try {
      const response = await fetch(this.getFetchFeaturesUrl(input), { signal })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const { features } = await response.json()
      if (!Array.isArray(features)) {
        throw new Error('Expected an array of geocoding features')
      }

      return this.transformFeatures(features).map((feature) => ({
        ...feature,
        properties: {
          id: `${this.id}:${feature.properties.id}`,
          provider: {
            id: this.id,
            label: this.label
          },
          data: feature.properties
        }
      }))
    } catch (error) {
      if (!signal.aborted) {
        console.error('Error fetching', this.label, ': ', error)
      }
      return []
    }
  }
}
