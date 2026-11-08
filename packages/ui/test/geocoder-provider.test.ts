import assert from 'node:assert/strict'
import { test } from 'node:test'

import { GeocoderProvider } from '../src/lib/shared/geocoder/provider.ts'
import type { GeocoderProviderGeoJsonFeature } from '../src/lib/shared/geocoder/types.ts'

class TestGeocoderProvider extends GeocoderProvider {
  getFetchFeaturesUrl() {
    return `https://example.test/${this.id}`
  }

  transformFeatures(features: unknown[]) {
    return features as GeocoderProviderGeoJsonFeature[]
  }
}

test('a geocoder returning 403 does not prevent results from another provider', async (context) => {
  context.mock.method(console, 'error', () => {})
  context.mock.method(globalThis, 'fetch', async (url: string) =>
    url.endsWith('/unavailable')
      ? Response.json(
          { results: { error: { type: 'KeyError' } } },
          { status: 403 }
        )
      : Response.json({
          features: [
            {
              geometry: { type: 'Point', coordinates: [4.9, 52.37] },
              properties: { id: 'amsterdam', label: 'Amsterdam' }
            }
          ]
        })
  )

  const providers = [
    new TestGeocoderProvider('unavailable', 'Unavailable'),
    new TestGeocoderProvider('gazetteer', 'Gazetteer')
  ]
  const [unavailable, gazetteer] = await Promise.all(
    providers.map((provider) => provider.fetchFeatures('Amsterdam'))
  )

  assert.deepEqual(unavailable, [])
  assert.equal(gazetteer[0]?.properties.data.label, 'Amsterdam')
})
