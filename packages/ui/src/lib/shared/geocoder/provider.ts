import type { GeoJsonFeatureGeocoder } from '$lib/shared/types'

export default abstract class GeocoderProvider {
  name: string
  apiKey?: string

  controller?: AbortController

  abstract queryFunction(text: string): string
  abstract featuresFunction(features: unknown[]): GeoJsonFeatureGeocoder[]

  constructor(name: string, apiKey?: string) {
    this.name = name
    this.apiKey = apiKey
  }

  async getFeatures(text: string): Promise<GeoJsonFeatureGeocoder[]> {
    if (this.controller) {
      this.controller.abort()
    }
    this.controller = new AbortController()
    const signal = this.controller.signal

    let result: GeoJsonFeatureGeocoder[] = []
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
      } else {
        console.warn('Previous fetch to', this.name, 'aborted')
      }
    }

    return result
  }
}
