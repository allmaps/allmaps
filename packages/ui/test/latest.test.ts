import assert from 'node:assert/strict'
import { test } from 'node:test'
import { generateAnnotation, type GeoreferencedMap } from '@allmaps/annotation'
import { fetchLatestMaps } from '../src/lib/latest/shared/fetch.ts'

const options = {
  count: 100,
  mapsApiBaseUrl: 'https://api.example.org/',
  annotationsApiBaseUrl: 'https://annotations.example.org/'
}

test('the unfiltered feed still requests maps from the REST API', async () => {
  const maps = [{ id: 'example' }]
  assert.deepEqual(
    await fetchLatestMaps(options, async (input, init) => {
      assert.equal(String(input), 'https://api.example.org/maps?limit=100')
      assert.equal(init?.credentials, 'omit')
      return Response.json(maps)
    }),
    maps
  )
})

test('a partner feed requests its collection and preserves map metadata', async () => {
  const map: GeoreferencedMap & { _allmaps: { area: number } } = {
    '@context': 'https://schemas.allmaps.org/map/2/context.json',
    type: 'GeoreferencedMap',
    id: 'https://annotations.example.org/maps/0123456789abcdef',
    modified: '2026-11-17T12:00:00Z',
    resource: {
      id: 'https://iiif.example.org/map',
      type: 'ImageService2',
      width: 100,
      height: 100
    },
    gcps: [
      { resource: [0, 0], geo: [4, 52] },
      { resource: [100, 100], geo: [5, 53] }
    ],
    resourceMask: [
      [0, 0],
      [100, 0],
      [100, 100]
    ],
    _allmaps: { area: 1000000 }
  }
  const maps = await fetchLatestMaps(
    { ...options, count: 250, organizationSlug: 'nypl' },
    async (input, init) => {
      assert.equal(
        String(input),
        'https://annotations.example.org/organizations/nypl?limit=250'
      )
      assert.equal(init?.credentials, 'include')
      return Response.json(generateAnnotation([map]))
    }
  )
  assert.equal(maps.length, 1)
  assert.deepEqual(maps[0], {
    ...map,
    created: undefined,
    resource: { ...map.resource, partOf: undefined, provider: undefined },
    transformation: undefined,
    resourceCrs: undefined
  })
})

test('an API error cannot be mistaken for a map response', async () => {
  await assert.rejects(
    fetchLatestMaps(options, async () => new Response(null, { status: 503 })),
    /Error fetching latest maps: 503/
  )
})
