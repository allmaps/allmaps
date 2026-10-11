import assert from 'node:assert/strict'
import { test } from 'node:test'
import { generateAnnotation } from '@allmaps/annotation'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { WarpedMapLayer } from '@allmaps/maplibre'
import { webMercatorToLonLat } from '@allmaps/project'
import type { Point } from '@allmaps/types'
import { SearchPreviews } from '../src/lib/search-previews.ts'
import { prepareMaps, renderedMap } from '../src/lib/model.ts'
import type { CollageMap } from '../src/lib/model.ts'

type MapOptions = Parameters<WarpedMapLayer['setMapOptions']>[1]

function source(id = 'one'): GeoreferencedMap {
  return {
    id: `https://example.org/maps/${id}`,
    type: 'GeoreferencedMap',
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

class Layer {
  maps = new Map<
    string,
    { annotation: GeoreferencedMap; options: MapOptions; cache: object }
  >()
  added: string[] = []
  removed: string[] = []

  addGeoreferencedMap(value: unknown, options: MapOptions = {}) {
    const annotation = value as GeoreferencedMap
    const id = annotation.id!
    this.maps.set(id, {
      annotation,
      options: {
        gcps: annotation.gcps,
        resourceMask: annotation.resourceMask,
        transformationType: annotation.transformation?.type ?? 'polynomial',
        ...options
      },
      cache: {}
    })
    this.added.push(id)
    return id
  }

  getMapOptions(id: string) {
    return this.maps.get(id)?.options
  }

  setMapOptions(id: string, options: MapOptions) {
    const map = this.maps.get(id)!
    map.options = { ...map.options, ...options }
  }

  removeGeoreferencedMapById(id: string) {
    this.removed.push(id)
    this.maps.delete(id)
    return id
  }

  import = (item: CollageMap) => {
    const rendered = renderedMap(item)
    this.setMapOptions(item.instanceId, {
      gcps: rendered.gcps,
      resourceMask: item.resourceMask,
      transformationType: 'helmert',
      visible: true,
      applyMask: true
    })
  }
}

test('import keeps the selected warped-map object and cache; cleanup removes only unused previews', () => {
  const layer = new Layer()
  const existing = layer.addGeoreferencedMap(source('existing'))
  const existingMap = layer.maps.get(existing)
  const previews = new SearchPreviews(layer)
  const first = source('first')
  const selectedId = previews.ensure('first', first)
  const unusedId = previews.ensure('unused', source('unused'))
  const selectedMap = layer.maps.get(selectedId)!
  const cache = selectedMap.cache
  assert.equal(previews.ensure('first', first), selectedId)
  const items = prepareMaps(generateAnnotation(first), [5000, 1000])
  const gcps = selectedMap.options.gcps
  previews.adopt(['first'], items, layer.import)
  previews.clear()
  assert.equal(items[0].instanceId, selectedId)
  assert.equal(layer.maps.get(selectedId), selectedMap)
  assert.equal(selectedMap.cache, cache)
  assert.notDeepEqual(selectedMap.options.gcps, gcps)
  assert.deepEqual(selectedMap.options.resourceMask, items[0].resourceMask)
  assert.equal(selectedMap.options.visible, true)
  assert.equal(selectedMap.options.applyMask, true)
  assert.equal(layer.maps.get(existing), existingMap)
  assert.deepEqual(layer.removed, [unusedId])
  assert.equal(layer.added.length, 3)
})

test('navigation and refinement retain selected previews even outside the current result set', () => {
  const layer = new Layer()
  const previews = new SearchPreviews(layer)
  const selected = previews.ensure('chosen', source('chosen'))
  const old = previews.ensure('old', source('old'))
  const current = previews.ensure('current', source('current'))
  const neighbor = previews.ensure('neighbor', source('neighbor'))
  previews.retain(['chosen', 'current', 'neighbor', undefined])
  assert.deepEqual(layer.removed, [old])
  previews.retain(['chosen'])
  assert.deepEqual([...layer.maps.keys()], [selected])
  assert.ok(layer.removed.includes(current) && layer.removed.includes(neighbor))
})

test('cancelling removes previews without touching an existing copy of the same source', () => {
  const layer = new Layer()
  const annotation = source()
  const original = layer.addGeoreferencedMap(annotation)
  const previews = new SearchPreviews(layer)
  const preview = previews.ensure('one', annotation)
  assert.notEqual(preview, original)
  previews.clear()
  previews.clear()
  assert.deepEqual([...layer.maps.keys()], [original])
  assert.deepEqual(layer.removed, [preview])
})

test('a failed import restores every preview and can be retried without replacing caches', () => {
  const layer = new Layer()
  const previews = new SearchPreviews(layer)
  const sources = [source('first'), source('second')]
  const ids = sources.map((source, i) => previews.ensure(String(i), source))
  const before = ids.map((id) => layer.maps.get(id)!)
  const options = before.map((map) => ({ ...map.options }))
  const items = sources.flatMap((source) =>
    prepareMaps(generateAnnotation(source), [4000, 5000])
  )
  const generatedIds = items.map((item) => item.instanceId)
  assert.throws(
    () =>
      previews.adopt(['0', '1'], items, (item) => {
        layer.import(item)
        if (item === items[1]) throw new Error('Import failed')
      }),
    /Import failed/
  )
  assert.deepEqual(
    items.map((item) => item.instanceId),
    generatedIds
  )
  ids.forEach((id, i) => {
    assert.equal(layer.maps.get(id), before[i])
    assert.deepEqual(layer.getMapOptions(id), options[i])
    assert.equal(previews.get(String(i)), id)
  })
  previews.adopt(['0', '1'], items, layer.import)
  previews.clear()
  assert.deepEqual([...layer.maps.keys()], ids)
  assert.deepEqual(layer.removed, [])
})
