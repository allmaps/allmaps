import type { GeocoderProviderGeoJsonFeature } from '$lib/shared/types.js'

export default abstract class GeocoderProvider {
  name: string
  apiKey?: string

  controller?: AbortController

  abstract queryFunction(text: string): string
  abstract featuresFunction(
    features: unknown[]
  ): GeocoderProviderGeoJsonFeature[]

  constructor(name: string, apiKey?: string) {
    this.name = name
    this.apiKey = apiKey
  }

  async getFeatures(text: string): Promise<GeocoderProviderGeoJsonFeature[]> {
    if (this.controller) {
      this.controller.abort()
    }
    this.controller = new AbortController()
    const signal = this.controller.signal

    let result: GeocoderProviderGeoJsonFeature[] = []
    if (text == '') {
      // Using if to avoid calling `fetch` eagerly during server side rendering
      return result
    }

    try {
      result = await fetch(this.queryFunction(text), {
        signal: signal
      })
        .then((response) => response.json())
        .then((response) => response.features)
        .then((features) => this.featuresFunction(features))
    } catch (error) {
      if (!signal.aborted) {
        console.error('Error fetching', this.name, ': ', error)
      }
    }

    return result.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        provider: this.name
      }
    }))
  }
}
