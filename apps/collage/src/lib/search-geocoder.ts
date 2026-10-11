import { GeocodeEarthGeocoderProvider } from '@allmaps/ui/geocoder'
import type { GeocoderGeoJsonFeature } from '@allmaps/ui/geocoder'

const number = '[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)'
const pair = new RegExp(`^(${number})(?:\\s*,\\s*|\\s+)(${number})$`)

/** All input uses latitude, longitude, with optional surrounding brackets. */
export function coordinateFeature(
  input: string
): GeocoderGeoJsonFeature | undefined {
  const text = input.trim()
  const array = text.startsWith('[') && text.endsWith(']')
  const match = (array ? text.slice(1, -1).trim() : text).match(pair)
  if (!match) return
  const latitude = Number(match[1]),
    longitude = Number(match[2])
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return
  const id = `coordinates:${longitude},${latitude}`
  return {
    geometry: { type: 'Point', coordinates: [longitude, latitude] },
    properties: {
      id,
      provider: { id: 'coordinates', label: 'Coordinates' },
      data: { id, label: `${latitude}, ${longitude}` }
    }
  }
}

export class SearchGeocoderProvider extends GeocodeEarthGeocoderProvider {
  constructor(apiKey: string) {
    super(apiKey, { includeVenues: true })
  }

  async fetchFeatures(input: string) {
    const coordinates = coordinateFeature(input)
    if (coordinates) {
      this.controller?.abort()
      return [coordinates]
    }
    if (
      !this.apiKey ||
      pair.test(input.trim()) ||
      input.trim().startsWith('[')
    ) {
      this.controller?.abort()
      return []
    }
    return super.fetchFeatures(input)
  }
}
