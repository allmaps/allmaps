import assert from 'node:assert/strict'
import { test } from 'node:test'
import { generateAnnotation } from '@allmaps/annotation'
import type { GeoreferencedMap } from '@allmaps/annotation'
import { loadRandomMaps, randomMapUrl } from '../src/lib/random-maps.ts'

function map(id: string, service = id): GeoreferencedMap {
  return {
    type: 'GeoreferencedMap',
    id: `https://example.org/maps/${id}`,
    resource: {
      id: `https://example.org/iiif/${service}`,
      type: 'ImageService2'
    },
    resourceMask: [
      [0, 0],
      [500, 0],
      [500, 500],
      [0, 500]
    ],
    gcps: [
      { resource: [0, 0], geo: [5, 52] },
      { resource: [500, 0], geo: [5.01, 52] },
      { resource: [0, 500], geo: [5, 51.99] }
    ]
  }
}

function imageInfo(id: string) {
  return {
    '@context': 'http://iiif.io/api/image/2/context.json',
    '@id': `https://example.org/iiif/${id}`,
    protocol: 'http://iiif.io/api/image',
    width: 1000,
    height: 800,
    profile: ['http://iiif.io/api/image/2/level2.json']
  }
}

test('random maps only check info.json by default, without fetching image pixels', async () => {
  const urls: string[] = []
  const result = await loadRandomMaps({
    fetchFn: async (input) => {
      const url = String(input)
      urls.push(url)
      if (url === randomMapUrl)
        return Response.json(generateAnnotation(map('good')))
      if (url === 'https://example.org/iiif/good/info.json')
        return Response.json(imageInfo('good'))
      return new Response('', { status: 500 })
    }
  })
  assert.equal(result.length, 1)
  assert.equal(result[0].resource.width, 1000)
  assert.equal(result[0].resource.height, 800)
  assert.deepEqual(
    urls.filter((url) => url !== randomMapUrl),
    ['https://example.org/iiif/good/info.json']
  )
})

test('random maps with image checks enabled use urban filters and skip duplicates, broken images and unsupported annotations', async () => {
  const invalid = map('unsupported')
  invalid.resourceCrs = { definition: 'EPSG:4326' }
  const candidates = [
    map('good'),
    map('missing'),
    map('broken'),
    map('invalid-info'),
    map('invalid-image'),
    map('good'),
    null,
    {},
    map('shared', 'good'),
    invalid,
    map('cors'),
    map('other')
  ]
  let requests = 0
  let closed = 0
  const probed = new Map<string, number>()
  const decoded: string[] = []
  const fetchFn: typeof fetch = async (input, init) => {
    const url = new URL(String(input))
    assert.ok(init?.signal)
    if (String(input) === randomMapUrl) {
      assert.equal(url.searchParams.get('minArea'), '250000')
      assert.equal(url.searchParams.get('maxArea'), '400000000')
      assert.equal(url.searchParams.get('minScale'), '0.2')
      assert.equal(url.searchParams.get('maxScale'), '20')
      const candidate = candidates[requests++]
      if (candidate === null) return new Response('', { status: 503 })
      return Response.json(
        'type' in candidate
          ? generateAnnotation(candidate as GeoreferencedMap)
          : candidate
      )
    }
    const id = url.pathname.split('/')[2]
    if (id === 'cors') throw new TypeError('Failed to fetch')
    if (url.pathname.endsWith('/info.json')) {
      probed.set(id, (probed.get(id) ?? 0) + 1)
      if (id === 'missing') return new Response('', { status: 404 })
      if (id === 'invalid-info') return Response.json({ login: true })
      return Response.json(imageInfo(id))
    }
    if (id === 'broken') return new Response('', { status: 500 })
    return new Response(id)
  }
  const result = await loadRandomMaps({
    fetchFn,
    checkImageData: true,
    decodeImage: async (blob) => {
      const id = await blob.text()
      if (id === 'invalid-image') throw new Error('Cannot decode image')
      decoded.push(id)
      return {
        width: 128,
        height: 102,
        close: () => {
          closed++
        }
      }
    }
  })
  assert.equal(requests, 12)
  assert.deepEqual(
    result.map((map) => map.id?.split('/').at(-1)),
    ['good', 'shared', 'other']
  )
  assert.equal(probed.get('good'), 1)
  assert.equal(probed.has('unsupported'), false)
  assert.deepEqual(decoded.sort(), ['good', 'other'])
  assert.equal(closed, 2)
  assert.ok(
    result.every(
      (map) => map.resource.width === 1000 && map.resource.height === 800
    )
  )
})

test('random map failures leave the caller with an explicit retryable error', async () => {
  await assert.rejects(
    loadRandomMaps({
      fetchFn: async () => new Response('', { status: 503 }),
      decodeImage: async () => {
        throw new Error('Unexpected image request')
      }
    }),
    /No available city-scale maps/
  )
})

test('cancelling random loading stops further requests and discards partial results', async () => {
  const controller = new AbortController()
  let requests = 0
  await assert.rejects(
    loadRandomMaps({
      signal: controller.signal,
      fetchFn: async () => {
        requests++
        controller.abort()
        throw controller.signal.reason
      },
      decodeImage: async () => {
        throw new Error('Unexpected image request')
      }
    }),
    { name: 'AbortError' }
  )
  assert.equal(requests, 1)
})
