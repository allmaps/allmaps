import assert from 'node:assert/strict'
import { test } from 'node:test'
import { generateAnnotation } from '@allmaps/annotation'
import type { GeoreferencedMap } from '@allmaps/annotation'
import {
  ProjectedGcpTransformer,
  lonLatToWebMercator,
  webMercatorToLonLat
} from '@allmaps/project'
import type { Point } from '@allmaps/types'
import {
  areaBounds,
  bufferFromRange,
  bufferToRange,
  cropMap,
  findMaps,
  mapsSearchUrl,
  resolvePlace,
  searchArea,
  resizeResults,
  selectionMaps,
  importSearchMap
} from '../src/lib/map-search.ts'
import type { SearchPlace } from '../src/lib/map-search.ts'
import {
  coordinateFeature,
  SearchGeocoderProvider
} from '../src/lib/search-geocoder.ts'
import {
  readSearches,
  saveSearch,
  removeSearch,
  cacheSearch,
  searchCache,
  searchKey
} from '../src/lib/search-session.ts'
import {
  exportCollage,
  openCollage,
  prepareMaps,
  renderedMap,
  setResourceMask
} from '../src/lib/model.ts'

function source(id = 'one'): GeoreferencedMap {
  return {
    type: 'GeoreferencedMap',
    id: `https://example.org/maps/${id}`,
    resource: {
      id: `https://example.org/iiif/${id}`,
      type: 'ImageService2',
      width: 1000,
      height: 1000
    },
    resourceMask: [
      [0, 0],
      [1000, 0],
      [1000, 1000],
      [0, 1000]
    ],
    gcps: [
      [0, 0],
      [1000, 0],
      [0, 1000]
    ].map(([x, y]) => ({
      resource: [x, y] as Point,
      geo: webMercatorToLonLat([x, -y])
    }))
  }
}
function place(latitude = 0): SearchPlace {
  return {
    id: 'test',
    label: 'Test',
    query: 'test',
    feature: {
      geometry: { type: 'Point', coordinates: [0, latitude] },
      properties: {
        id: 'test',
        provider: { id: 'ge', label: 'Geocode Earth' },
        data: { id: 'test', label: 'Test' }
      }
    }
  }
}

test('buffers use comparable ground metres at different latitudes and API bbox order is south,west,north,east', () => {
  const equator = areaBounds(searchArea(place(), 250))
  const north = areaBounds(searchArea(place(60), 250))
  assert.ok(
    Math.abs((north[2] - north[0]) / (equator[2] - equator[0]) - 2) < 0.01
  )
  const url = new URL(mapsSearchUrl(searchArea(place(60), 250)))
  assert.deepEqual(url.searchParams.get('intersects')?.split(',').map(Number), [
    north[1],
    north[0],
    north[3],
    north[2]
  ])
  assert.equal(url.searchParams.get('limit'), '100')
  assert.throws(() => searchArea(place(), 0), /buffer/)
  assert.throws(() => searchArea(place(89), 250), /poles/)
})

test('buffer range preserves the default and covers 10 m to 50 km with finer control near small values', () => {
  assert.equal(bufferFromRange(0), 10)
  assert.equal(bufferFromRange(100), 50000)
  assert.equal(bufferFromRange(bufferToRange(250)), 250)
  assert.ok(bufferFromRange(51) - bufferFromRange(50) < 100)
})

function circle(radius = 250) {
  const p = place()
  p.feature.geometry.coordinates = webMercatorToLonLat([500, -500])
  return searchArea(p, radius)
}

test('place search uses only its point, ignoring provider bounds and legacy geometry', () => {
  const p = place()
  p.feature.bbox = [-5, -5, 5, 5]
  const resolved = resolvePlace(p.feature, 'Example town')
  assert.equal(resolved.feature.bbox, undefined)
  Object.assign(resolved, {
    geometry: { type: 'Polygon', coordinates: [] },
    shape: 'boundary'
  })
  assert.deepEqual(searchArea(resolved, 250), searchArea(place(), 250))
})

test('coordinates always use latitude, longitude, including bracketed pairs, without requesting a geocoder', async () => {
  for (const input of ['52.01, 4.36', '[52.01, 4.36]', ' 52.01 4.36 ']) {
    assert.deepEqual(
      coordinateFeature(input)?.geometry.coordinates,
      [4.36, 52.01]
    )
  }
  assert.deepEqual(
    coordinateFeature('-.5, +120.25')?.geometry.coordinates,
    [120.25, -0.5]
  )
  for (const input of ['91, 4', '52, 181', 'NaN, 4', 'Delft', '52,4,6'])
    assert.equal(coordinateFeature(input), undefined)
  // An empty key supports local coordinate entry and cannot request name search.
  const provider = new SearchGeocoderProvider('')
  assert.equal((await provider.fetchFeatures('52.01, 4.36')).length, 1)
  assert.deepEqual(await provider.fetchFeatures('91, 4'), [])
  assert.deepEqual(await provider.fetchFeatures('Delft'), [])
})

test('circle replaces a partial original mask without mutating it or clipping away segments', () => {
  const map = source()
  map.resourceMask = [
    [0, 0],
    [500, 0],
    [500, 1000],
    [0, 1000]
  ]
  const before = structuredClone(map)
  const cropped = cropMap(map, circle())!
  assert.equal(cropped.resourceMask.length, 128)
  assert.ok(cropped.resourceMask.some(([x]) => x > 700))
  assert.ok(
    cropped.resourceMask.every(
      ([x, y]) => Math.abs(Math.hypot(x - 500, y - 500) - 250) < 1e-4
    )
  )
  assert.deepEqual(map, before)
  assert.deepEqual(cropped.gcps, map.gcps)
  assert.equal(cropMap(map, circle(600)), undefined)
  const outside = place()
  outside.feature.geometry.coordinates = webMercatorToLonLat([2000, -2000])
  assert.equal(cropMap(map, searchArea(outside, 100)), undefined)
})

test('crop inverts the forward Helmert fit even when original GCPs have residuals', () => {
  const map = source()
  map.gcps.push({
    resource: [1000, 1000],
    geo: webMercatorToLonLat([1200, -1100])
  })
  const transform = new ProjectedGcpTransformer(map.gcps, 'helmert')
  const area = circle()
  const cropped = cropMap(map, area)!
  cropped.resourceMask.forEach((point, i) => {
    const actual = transform.transformToProjectedGeo(point)
    const expected = lonLatToWebMercator(area.geometry.coordinates[0][i])
    assert.ok(
      Math.hypot(actual[0] - expected[0], actual[1] - expected[1]) < 1e-4
    )
  })
})

test('circle and original mask choices preserve placement, editable masks and export provenance', () => {
  const original = source()
  const map = cropMap(original, circle())!
  const results = [{ id: original.id!, original, map }]
  assert.deepEqual(selectionMaps(results, [original.id!], []), [map])
  assert.deepEqual(selectionMaps(results, [original.id!], [original.id!]), [
    original
  ])
  assert.deepEqual(selectionMaps(results, [], []), [])
  const [item] = prepareMaps(generateAnnotation(map))
  const before = renderedMap(item)
  setResourceMask(item, original.resourceMask)
  assert.deepEqual(renderedMap(item).gcps, before.gcps)
  setResourceMask(item, map.resourceMask)
  assert.deepEqual(renderedMap(item), before)
  const [reopened] = openCollage(exportCollage([item]))
  assert.deepEqual(reopened.resourceMask, map.resourceMask)
  assert.equal((reopened.baseline._allmaps as { id: string }).id, original.id)
  assert.equal(reopened.baseline.gcps.length, 3)
})

test('circles remain round and equally sized after normalizing maps at different latitudes', () => {
  for (const latitude of [0, 60]) {
    const map = source()
    const center = lonLatToWebMercator([0, latitude])
    const scale = Math.cos((latitude * Math.PI) / 180)
    map.gcps = map.gcps.map(({ resource: [x, y] }) => ({
      resource: [x, y],
      geo: webMercatorToLonLat([
        center[0] + (x - 500) / scale,
        center[1] - (y - 500) / scale
      ])
    }))
    const crop = cropMap(map, searchArea(place(latitude), 250))!
    const [item] = prepareMaps(generateAnnotation(crop))
    assert.ok(
      item.localMask.every(([x, y]) => Math.abs(Math.hypot(x, y) - 250) < 1e-3)
    )
  }
})

function info(id: string) {
  return {
    '@context': 'http://iiif.io/api/image/2/context.json',
    '@id': id,
    protocol: 'http://iiif.io/api/image',
    width: 1000,
    height: 1000,
    profile: ['http://iiif.io/api/image/2/level2.json']
  }
}

test('shrinking the circle brings checked sources back without fetching or clipping', () => {
  const original = source()
  original.resource.width = 700
  original.resource.height = 700
  original.resourceMask = [
    [0, 0],
    [700, 0],
    [700, 700],
    [0, 700]
  ]
  const results = {
    maps: [],
    sources: [original],
    excluded: 0,
    skipped: 0,
    limited: false
  }
  const large = resizeResults(results, circle(250))
  assert.equal(large.maps.length, 0)
  assert.equal(large.excluded, 1)
  const small = resizeResults(large, circle(100))
  assert.equal(small.maps.length, 1)
  assert.equal(small.excluded, 0)
  assert.equal(small.maps[0].map.resourceMask.length, 128)
})

test('map search checks only info.json, shares probes, skips broken services and streams available crops', async () => {
  const one = source(),
    two = source('two'),
    missing = source('missing'),
    small = source('small')
  small.resource.id = one.resource.id
  small.gcps = small.gcps.map(({ resource, geo }) => ({
    resource,
    geo: webMercatorToLonLat(
      lonLatToWebMercator(geo).map((n) => n / 2) as Point
    )
  }))
  two.resource.id = one.resource.id
  const calls: string[] = [],
    progress: number[] = []
  const area = circle()
  const found = await findMaps(area, {
    signal: new AbortController().signal,
    onprogress: (result) => progress.push(result.maps.length),
    fetchFn: async (input) => {
      const url = String(input)
      calls.push(url)
      if (url.includes('/maps?'))
        return Response.json(
          generateAnnotation([one, two, missing, one, small])
        )
      assert.ok(url.endsWith('/info.json'))
      if (url.includes('missing')) return new Response('', { status: 404 })
      return Response.json(info(one.resource.id))
    }
  })
  assert.equal(found.maps.length, 2)
  assert.equal(found.skipped, 1)
  assert.equal(found.excluded, 1)
  assert.equal(found.sources.length, 3)
  assert.equal(resizeResults(found, circle(450)).maps.length, 2)
  assert.equal(resizeResults(found, circle(600)).maps.length, 0)
  assert.equal(resizeResults(found, circle(100)).maps.length, 2)
  assert.equal(calls.filter((url) => url.endsWith('/info.json')).length, 2)
  assert.ok(progress.includes(1))
  assert.ok(found.maps.every(({ map }) => map.resourceMask.length === 128))
  assert.deepEqual(found.maps[0].original.resourceMask, one.resourceMask)
  assert.notDeepEqual(found.maps[0].map.resourceMask, one.resourceMask)
})

test('aborted searches never deliver late progress or continue probing', async () => {
  const controller = new AbortController()
  let progress = 0,
    calls = 0
  await assert.rejects(
    findMaps(circle(), {
      signal: controller.signal,
      onprogress: () => progress++,
      fetchFn: async () => {
        calls++
        if (calls === 1) return Response.json(generateAnnotation(source()))
        controller.abort()
        throw controller.signal.reason
      }
    }),
    { name: 'AbortError' }
  )
  assert.equal(progress, 0)
  assert.equal(calls, 2)
})

test('session history keeps radius and mask settings but never retains a selection', () => {
  let json = ''
  const storage = {
    getItem: () => json,
    setItem: (_key: string, value: string) => {
      json = value
    }
  }
  const entry = {
    place: place(),
    meters: 250,
    current: 'map-id',
    importMask: 'original' as const
  }
  const saved = saveSearch(storage, [], entry)
  assert.deepEqual(readSearches(storage), [entry])
  assert.equal(saveSearch(storage, saved, entry).length, 1)
  json = JSON.stringify([{ ...entry, selected: ['stale-selection'] }])
  assert.deepEqual(readSearches(storage), [entry])
  assert.equal(
    saveSearch(
      {
        setItem: () => {
          throw new Error('disabled')
        }
      },
      [],
      entry
    ).length,
    1
  )
  json = '[{}]'
  assert.deepEqual(readSearches(storage), [])
  json = JSON.stringify([{ ...entry, importMask: 'invalid' }])
  assert.deepEqual(readSearches(storage), [])
})

test('removing a recent search persists and evicts only that response, including refined searches of the same place', () => {
  let json = ''
  const storage = {
    getItem: () => json,
    setItem: (_key: string, value: string) => {
      json = value
    }
  }
  const one = {
    place: place(),
    meters: 250,
    current: undefined,
    importMask: undefined
  }
  const two = structuredClone(one)
  two.place.feature.geometry.coordinates = [0.01, 0]
  let entries = saveSearch(storage, [], one)
  entries = saveSearch(storage, entries, two)
  assert.equal(entries.length, 2)
  const results = {
    maps: [],
    sources: [],
    skipped: 0,
    excluded: 0,
    limited: false
  }
  cacheSearch(one, results)
  cacheSearch(two, results)
  entries = removeSearch(storage, entries, one)
  assert.deepEqual(entries, [two])
  assert.deepEqual(readSearches(storage), [two])
  assert.equal(searchCache.has(searchKey(one)), false)
  assert.equal(searchCache.has(searchKey(two)), true)
  assert.deepEqual(removeSearch(undefined, entries, two), [])
  assert.deepEqual(readSearches(), [])
})

test('import shape applies to the output without changing the crop, source or GCPs', () => {
  const original = source()
  original.resourceMask = [
    [100, 100],
    [900, 100],
    [900, 900],
    [100, 900]
  ]
  const cropped = cropMap(original, circle())!
  const before = structuredClone({ original, cropped })
  assert.deepEqual(importSearchMap(cropped, original, 'circle'), cropped)
  assert.deepEqual(importSearchMap(cropped, original, 'original'), original)
  const full = importSearchMap(cropped, original, 'full')
  assert.deepEqual(full.resourceMask, [
    [0, 0],
    [1000, 0],
    [1000, 1000],
    [0, 1000]
  ])
  assert.deepEqual(full.gcps, original.gcps)
  assert.deepEqual({ original, cropped }, before)
})
