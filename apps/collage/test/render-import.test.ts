import assert from 'node:assert/strict'
import { test } from 'node:test'
import { generateAnnotation } from '@allmaps/annotation'
import { TriangulatedWarpedMap, WarpedMapList } from '@allmaps/render'
import { prepareMaps, renderedMap } from '../src/lib/model.ts'
import type { CollageMap } from '../src/lib/model.ts'
import { renderImport } from '../src/lib/render-import.ts'

function fixture() {
  const items = prepareMaps(
    generateAnnotation(
      Array.from({ length: 3 }, () => ({
        type: 'GeoreferencedMap' as const,
        resource: {
          id: 'https://example.org/iiif/map',
          type: 'ImageService2' as const,
          width: 1000,
          height: 800
        },
        resourceMask: [
          [0, 0],
          [600, 0],
          [600, 500],
          [0, 500]
        ],
        gcps: [
          { resource: [0, 0], geo: [5, 52] },
          { resource: [600, 0], geo: [5.01, 52] },
          { resource: [0, 500], geo: [5, 51.99] }
        ]
      }))
    )
  )
  // Valid annotation data, but crossing constraints cannot be triangulated.
  items[1].resourceMask = [
    [0, 0],
    [600, 450],
    [600, 0],
    [0, 500]
  ]
  const list = new WarpedMapList<TriangulatedWarpedMap>({
    warpedMapFactory: (id, map, options, mapOptions) =>
      new TriangulatedWarpedMap(id, map, options, mapOptions)
  })
  const render = (item: CollageMap) =>
    list.addGeoreferencedMap({ ...renderedMap(item), id: item.instanceId })
  const remove = (item: CollageMap) => {
    if (list.getWarpedMap(item.instanceId))
      list.removeGeoreferencedMapById(item.instanceId)
  }
  return { items, list, render, remove }
}

test('random imports skip triangulation failures and render the rest in order', () => {
  const { items, list, render, remove } = fixture()
  const accepted = renderImport(items, render, remove, true)
  assert.deepEqual(accepted, [items[0], items[2]])
  assert.deepEqual(
    [...list.warpedMapsById.keys()],
    accepted.map((item) => item.instanceId)
  )
  assert.ok(
    list.getWarpedMap(items[2].instanceId)!.resourceTrianglePoints.length
  )
  accepted.forEach(remove)
})

test('explicit imports roll back successful additions after a triangulation failure', () => {
  const { items, list, render, remove } = fixture()
  assert.throws(
    () => renderImport(items, render, remove),
    /Failed to triangulate/
  )
  assert.equal(list.warpedMapsById.size, 0)
})

test('an entirely failed random import reports the failure without removing existing maps', () => {
  const { items, list, render, remove } = fixture()
  render(items[0])
  assert.throws(
    () => renderImport([items[1]], render, remove, true),
    /Failed to triangulate/
  )
  assert.deepEqual([...list.warpedMapsById.keys()], [items[0].instanceId])
  remove(items[0])
})

test('a failure after insertion cleans up the partial map and continues', () => {
  const { items, list, render, remove } = fixture()
  const accepted = renderImport(
    [items[0], items[2]],
    (item) => {
      render(item)
      if (item === items[0]) throw new Error('Appearance failed')
    },
    remove,
    true
  )
  assert.deepEqual(accepted, [items[2]])
  assert.deepEqual([...list.warpedMapsById.keys()], [items[2].instanceId])
  remove(items[2])
})
