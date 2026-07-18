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

    let results: GeocoderProviderGeoJsonFeature[] = []

    try {
      results = await fetch(this.getFetchFeaturesUrl(input), {
        signal
      })
        .then((response) => response.json())
        .then((response) => response.features)
        .then((features) => this.transformFeatures(features))
    } catch (error) {
      if (!signal.aborted) {
        console.error('Error fetching', this.label, ': ', error)
      }
    }

    return results.map((feature) => ({
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
  }
}
