import assert from 'node:assert/strict'
import { test } from 'node:test'
import { generateAnnotation, parseAnnotation } from '@allmaps/annotation'
import { computeGeoreferencedMapBearing } from '@allmaps/bearing'
import { snapRotation } from '../src/lib/rotation.ts'
import { lonLatToWebMercator, webMercatorToLonLat } from '@allmaps/project'
import { solveLayout } from '../src/lib/layout-task.ts'
import { maskCoordinates, constrainToImage } from '../src/lib/mask-geometry.ts'
import {
  addMaps,
  prepareMaps,
  openCollage,
  exportCollage,
  placedMap,
  place,
  normalizeMap,
  originalAnnotationUrl,
  viewerUrl,
  transformer,
  contains,
  outline,
  mapCenter,
  rotatePlacement,
  rotate,
  center,
  bearingRotation,
  alignBearings,
  mirrorMap,
  setMapTransform,
  resetMapTransform,
  resetMapOptions,
  makeIsometric,
  ensureMapTransform,
  arrangeMaps,
  arrangeGeographically,
  duplicateMaps,
  setResourceMask,
  validateResourceMask,
  resolveImageSize
} from '../src/lib/model.ts'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { Point } from '@allmaps/types'
import type { CollageMap } from '../src/lib/model.ts'

const R = 6378137
const radians = Math.PI / 180
const distance = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1])
function close(actual: number, expected: number, tolerance = 1e-5) {
  assert.ok(Math.abs(actual - expected) <= tolerance, actual + ' ≠ ' + expected)
}

function fixture(latitude = 52, longitude = 5): GeoreferencedMap {
  const pixels: Point[] = [
    [0, 0],
    [1000, 0],
    [1000, 1000],
    [0, 1000]
  ]
  return {
    type: 'GeoreferencedMap',
    id: 'https://example.org/annotations/' + latitude,
    resource: {
      id: 'https://example.org/iiif/map',
      type: 'ImageService2',
      width: 1000,
      height: 1000
    },
    resourceMask: pixels,
    gcps: pixels.map((resource) => ({
      resource,
      geo: [
        longitude +
          (resource[0] - 500) / (R * Math.cos(latitude * radians)) / radians,
        latitude + (500 - resource[1]) / R / radians
      ]
    })),
    transformation: { type: 'polynomial', options: { order: 1 } }
  }
}

function affineFixture(): GeoreferencedMap {
  const map = fixture()
  const origin = lonLatToWebMercator([5, 52])
  map.gcps = Array.from({ length: 30 }, (_, i) => {
    const resource: Point = [(i % 6) * 200, Math.floor(i / 6) * 250]
    const [x, y] = resource
    return {
      resource,
      geo: webMercatorToLonLat([
        origin[0] + 2.4 * x + 0.35 * y + Math.sin(i) * 4,
        origin[1] + 0.2 * x - 1.8 * y + Math.cos(i) * 5
      ])
    }
  })
  return map
}

test('ring reset defaults to each map’s imported appearance, preserving edits and metadata', () => {
  const [source] = addMaps(generateAnnotation(fixture()))
  source.appearance.opacity = 0.65
  source.appearance.hue = 0.3
  source.appearance.colorize = true
  const [item] = openCollage(exportCollage([source]))
  const initial = structuredClone(item.initialOptions)
  item.groupId = 'group'
  item.title = 'Edited title'
  item.appearance.opacity = 0.1
  item.appearance.saturation = 0
  item.appearance.hue = 0.8
  item.appearance.colorize = false
  item.appearance.removeBackground = true
  item.appearance.backgroundColor = '#abcdef'
  mirrorMap(item)
  setResourceMask(item, [
    [100, 200],
    [800, 200],
    [800, 700],
    [100, 700]
  ])
  item.placement.rotation += 0.5
  const geometry = placedMap(item)
  resetMapOptions(item)
  assert.deepEqual(item.appearance, source.appearance)
  assert.deepEqual(placedMap(item), geometry)
  assert.equal(item.groupId, 'group')
  assert.equal(item.title, 'Edited title')
  assert.deepEqual(item.initialOptions, initial)
})

test('full ring reset restores the imported geometry, including mirrors, at the current center', () => {
  for (const importType of ['helmert', 'polynomial'] as const) {
    const [item] = prepareMaps(
      generateAnnotation(affineFixture()),
      [100, 200],
      undefined,
      importType
    )
    const original = structuredClone(item)
    item.groupId = 'group'
    setMapTransform(item, { scaleX: 1.5, scaleY: 0.8, skewX: 0.3, skewY: -0.2 })
    mirrorMap(item, 'vertical')
    setResourceMask(item, [
      [100, 100],
      [700, 100],
      [700, 900],
      [100, 900]
    ])
    item.placement.position = [5000, -6000]
    item.placement.rotation += 1.2
    item.appearance.opacity = 0.25
    const currentCenter = mapCenter(item)
    resetMapOptions(item, 'all')
    close(distance(mapCenter(item), currentCenter), 0)
    assert.equal(item.instanceId, original.instanceId)
    assert.equal(item.groupId, 'group')
    assert.equal(item.mirrored, original.mirrored)
    assert.deepEqual(item.affine, original.affine)
    assert.deepEqual(item.resourceMask, original.resourceMask)
    assert.deepEqual(item.appearance, original.appearance)
    assert.equal(item.placement.rotation, original.placement.rotation)
    const before = transformer(placedMap(original))
    const after = transformer(placedMap(item))
    for (const point of original.resourceMask) {
      const a = before.transformToProjectedGeo(point)
      const b = after.transformToProjectedGeo(point)
      close(b[0] - currentCenter[0], a[0] - mapCenter(original)[0])
      close(b[1] - currentCenter[1], a[1] - mapCenter(original)[1])
    }
  }
})

test('opening a collage establishes new initial options without exporting reset snapshots', () => {
  const [item] = addMaps(generateAnnotation(fixture()))
  setMapTransform(item, { scaleX: 1.3, scaleY: 0.9, skewX: 0.25, skewY: 0 })
  mirrorMap(item)
  item.placement.rotation = 0.8
  item.appearance.opacity = 0.6
  const annotation = exportCollage([item])
  assert.equal(JSON.stringify(annotation).includes('initialOptions'), false)
  const [opened] = openCollage(annotation)
  const initial = structuredClone(opened)
  mirrorMap(opened)
  opened.placement.rotation = 1.6
  opened.appearance.opacity = 0.2
  resetMapOptions(opened, 'all')
  assert.deepEqual(opened.appearance, initial.appearance)
  assert.deepEqual(opened.affine, initial.affine)
  assert.equal(opened.mirrored, initial.mirrored)
  assert.equal(opened.placement.rotation, initial.placement.rotation)
  close(distance(mapCenter(opened), mapCenter(initial)), 0)
  placedMap(opened).gcps.forEach((gcp, i) => {
    const expected = placedMap(initial).gcps[i]
    close(distance(gcp.geo, expected.geo), 0)
  })
})

function setSkew(item: CollageMap, horizontal: number, vertical: number) {
  setMapTransform(item, {
    scaleX: 1,
    scaleY: 1,
    skewX: horizontal,
    skewY: vertical
  })
}

test('three synthetic GCPs preserve the full least-squares Helmert fit at ground scale', () => {
  const source = affineFixture()
  const before = structuredClone(source)
  const fitted = transformer({ ...source, transformation: { type: 'helmert' } })
  const pivot = center(fitted.transformToProjectedGeo(source.resourceMask))
  const scale = Math.cos(webMercatorToLonLat(pivot)[1] * radians)
  const map = normalizeMap(source)
  assert.equal(map.gcps.length, 3)
  assert.equal(map.transformation?.type, 'helmert')
  assert.deepEqual(
    map.gcps.map((gcp) => gcp.resource),
    [
      [500, 500],
      [1000, 500],
      [500, 1000]
    ]
  )
  assert.deepEqual(source, before)
  const reduced = transformer(map)
  for (let x = 0; x <= 1000; x += 125)
    for (let y = 0; y <= 1000; y += 125) {
      const original = fitted.transformToProjectedGeo([x, y])
      close(
        distance(reduced.transformToProjectedGeo([x, y]), [
          (original[0] - pivot[0]) * scale,
          (original[1] - pivot[1]) * scale
        ]),
        0
      )
    }
  const origin = reduced.transformToProjectedGeo([500, 500])
  close(
    distance(origin, reduced.transformToProjectedGeo([600, 500])),
    distance(origin, reduced.transformToProjectedGeo([500, 600]))
  )
})

test('two-point sources and narrow crops retain stable, well-separated samples', () => {
  const source = fixture(0)
  source.gcps = source.gcps.slice(0, 2)
  source.transformation = { type: 'helmert' }
  source.resourceMask = [
    [490, 0],
    [510, 0],
    [510, 1000],
    [490, 1000]
  ]
  const [item] = addMaps(generateAnnotation(source))
  assert.deepEqual(
    item.baseline.gcps.map((gcp) => gcp.resource),
    [
      [500, 500],
      [510, 500],
      [500, 1000]
    ]
  )
  const transform = transformer(placedMap(item))
  close(
    distance(
      transform.transformToProjectedGeo([500, 0]),
      transform.transformToProjectedGeo([500, 1000])
    ),
    1000,
    0.001
  )
  const [reopened] = openCollage(exportCollage([item]))
  assert.equal(reopened.baseline.gcps.length, 3)
  outline(item).forEach((point, i) =>
    close(distance(point, outline(reopened)[i]), 0)
  )
})

function bearingFixture(degrees: number, longitude = 5): GeoreferencedMap {
  const map = fixture(52, longitude)
  const pivot = lonLatToWebMercator([longitude, 52])
  map.gcps = map.gcps.map((gcp) => {
    const projected = lonLatToWebMercator(gcp.geo)
    const offset = rotate(
      [projected[0] - pivot[0], projected[1] - pivot[1]],
      degrees * radians
    )
    return {
      ...gcp,
      geo: webMercatorToLonLat([pivot[0] + offset[0], pivot[1] + offset[1]])
    }
  })
  return map
}

test('bearing alignment makes each selected map upright around its own visible center', () => {
  const items = addMaps(
    generateAnnotation([
      bearingFixture(35),
      bearingFixture(-70, 5.1),
      bearingFixture(140, 5.2)
    ])
  )
  items.forEach((item, i) => {
    item.placement.rotation = 2 * Math.PI + i * 0.7
    setResourceMask(item, [
      [50, 80],
      [600, 100],
      [570, 700],
      [100, 580]
    ])
  })
  const before = structuredClone(items)
  alignBearings([items[0], items[2]])
  assert.deepEqual(items[1], before[1])
  for (const index of [0, 2]) {
    const item = items[index]
    close(computeGeoreferencedMapBearing(placedMap(item)), 0)
    close(distance(mapCenter(item), mapCenter(before[index])), 0)
    close(
      distance(outline(item)[0], outline(item)[1]),
      distance(outline(before[index])[0], outline(before[index])[1])
    )
    assert.deepEqual(item.baseline, before[index].baseline)
    assert.deepEqual(item.resourceMask, before[index].resourceMask)
    assert.deepEqual(
      item.geographicReference,
      before[index].geographicReference
    )
  }
})

test('bearing alignment survives export/reopen and full turns without reversing its sign', () => {
  for (const angle of [-179, -35, 0, 42, 179]) {
    const [original] = addMaps(generateAnnotation(bearingFixture(angle)))
    original.placement.rotation = 4 * Math.PI + 1.3
    original.placement.position = [7300, -1200]
    const [item] = openCollage(exportCollage([original]))
    close(Math.sin(bearingRotation(item)), Math.sin(-angle * radians))
    const pivot = mapCenter(item)
    const rotation = item.placement.rotation
    alignBearings([item])
    close(computeGeoreferencedMapBearing(placedMap(item)), 0)
    close(distance(mapCenter(item), pivot), 0)
    assert.ok(Math.abs(rotation - item.placement.rotation) <= Math.PI)
    const [reopened] = openCollage(exportCollage([item]))
    close(computeGeoreferencedMapBearing(placedMap(reopened)), 0)
    outline(reopened).forEach((point, i) =>
      close(distance(point, outline(item)[i]), 0)
    )
  }
})

test('bearing snapping rotates a group rigidly using its anchor, without aligning members individually', () => {
  const items = addMaps(
    generateAnnotation([bearingFixture(35), bearingFixture(-70, 5.1)])
  )
  const pivot: Point = [250, -160]
  const before = items.map((item) => structuredClone(item.placement))
  const centers = items.map(mapCenter)
  const target = bearingRotation(items[0])
  const snapped = snapRotation(target + 2 * radians, target)
  const delta = snapped - items[0].placement.rotation
  items.forEach((item, i) => {
    item.placement = rotatePlacement(before[i], pivot, delta)
  })
  close(computeGeoreferencedMapBearing(placedMap(items[0])), 0)
  close(
    distance(mapCenter(items[0]), mapCenter(items[1])),
    distance(centers[0], centers[1])
  )
  close(
    items[0].placement.rotation - items[1].placement.rotation,
    before[0].rotation - before[1].rotation
  )
  assert.ok(Math.abs(computeGeoreferencedMapBearing(placedMap(items[1]))) > 90)
})

test('Mirror reflects image X rather than rotating it, retaining center, scale and crop', () => {
  const [item] = addMaps(generateAnnotation(bearingFixture(37)))
  item.placement = { position: [5800, -9200], rotation: 0.6 }
  const before = structuredClone(item)
  const original = transformer(placedMap(item))
  mirrorMap(item)
  assert.equal(item.mirrored, true)
  assert.equal(item.baseline.transformation?.type, 'polynomial')
  assert.equal(item.baseline.gcps.length, 3)
  assert.deepEqual(item.resourceMask, before.resourceMask)
  close(distance(mapCenter(item), mapCenter(before)), 0)
  const reflected = transformer(placedMap(item))
  for (const point of [
    [0, 0],
    [500, 500],
    [123, 456],
    [1000, 1000]
  ] as Point[]) {
    close(
      distance(
        reflected.transformToProjectedGeo(point),
        original.transformToProjectedGeo([1000 - point[0], point[1]])
      ),
      0
    )
  }
  close(
    distance(outline(item)[0], outline(item)[1]),
    distance(outline(before)[0], outline(before)[1])
  )
  mirrorMap(item)
  assert.equal(item.mirrored, false)
  assert.equal(item.baseline.transformation?.type, 'helmert')
  assert.equal(item.baseline.gcps.length, 3)
  outline(item).forEach((point, i) =>
    close(distance(point, outline(before)[i]), 0)
  )
})

test('mirrored geometry survives movement, export/reopen, mask editing, and bearing alignment', () => {
  const [item] = addMaps(generateAnnotation(bearingFixture(-28)))
  mirrorMap(item)
  item.placement = { position: [7000, -8000], rotation: 1.4 }
  const exported = exportCollage([item])
  assert.equal(JSON.stringify(exported).includes('"mirrored"'), false)
  const [loaded] = openCollage(exported)
  assert.equal(loaded.mirrored, true)
  outline(loaded).forEach((point, i) =>
    close(distance(point, outline(item)[i]), 0)
  )
  setResourceMask(loaded, [
    [50, 50],
    [700, 70],
    [660, 650],
    [100, 600]
  ])
  const mask = maskCoordinates(loaded)
  close(
    distance(
      maskCoordinates(loaded).toResource(mask.toGeo([230, 340])),
      [230, 340]
    ),
    0
  )
  const centerBefore = mapCenter(loaded)
  alignBearings([loaded])
  close(distance(mapCenter(loaded), centerBefore), 0)
  close(
    computeGeoreferencedMapBearing(placedMap(loaded), {
      orientation: 'vertical'
    }),
    0
  )
  const [reopened] = openCollage(exportCollage([loaded]))
  assert.equal(reopened.mirrored, true)
  outline(loaded).forEach((point, i) =>
    close(distance(point, outline(reopened)[i]), 0)
  )
})

test('mirroring a selection preserves each edited crop center and leaves other maps alone', () => {
  const items = addMaps(
    generateAnnotation([bearingFixture(25), fixture(), bearingFixture(-70)])
  )
  items.forEach((item, i) => {
    item.placement.rotation = 0.7 * i
    setResourceMask(item, [
      [40, 100],
      [850, 180],
      [750, 900],
      [400, 500]
    ])
  })
  const before = structuredClone(items)
  ;[items[0], items[2]].forEach((item) => mirrorMap(item))
  assert.deepEqual(items[1], before[1])
  for (const i of [0, 2]) {
    close(distance(mapCenter(items[i]), mapCenter(before[i])), 0)
    assert.deepEqual(
      items[i].geographicReference,
      before[i].geographicReference
    )
    mirrorMap(items[i])
    outline(items[i]).forEach((point, j) =>
      close(distance(point, outline(before[i])[j]), 0)
    )
  }
})

test('mirroring an opened nonlinear map retains its warp and can be reversed', () => {
  const source = fixture()
  source.transformation = { type: 'thinPlateSpline' }
  source.gcps[2].geo[0] += 0.001
  const [item] = openCollage(generateAnnotation(source))
  const before = structuredClone(item)
  const original = transformer(placedMap(item))
  mirrorMap(item)
  assert.equal(item.baseline.transformation?.type, 'thinPlateSpline')
  const actual = transformer(placedMap(item))
  for (const point of [
    [50, 50],
    [830, 210],
    [900, 920]
  ] as Point[])
    close(
      distance(
        actual.transformToProjectedGeo(point),
        original.transformToProjectedGeo([1000 - point[0], point[1]])
      ),
      0,
      0.01
    )
  mirrorMap(item)
  outline(item).forEach((point, i) =>
    close(distance(point, outline(before)[i]), 0, 0.01)
  )
})

test('equal ground distances near 0°, 52°, and 70° have equal canvas scale', () => {
  for (const latitude of [0, 52, 70]) {
    const map = normalizeMap(fixture(latitude))
    const transform = transformer(map)
    const origin = transform.transformToProjectedGeo([500, 500])
    close(
      distance(origin, transform.transformToProjectedGeo([600, 500])),
      100,
      0.001
    )
    close(
      distance(origin, transform.transformToProjectedGeo([500, 600])),
      100,
      0.001
    )
  }
})

test('adding a page includes every map and preserves their relative ground sizes', () => {
  const maps = [fixture(0), fixture(52), fixture(70)]
  maps[1].gcps = maps[1].gcps.map((gcp) => ({
    ...gcp,
    geo: [5 + (gcp.geo[0] - 5) * 2, 52 + (gcp.geo[1] - 52) * 2]
  }))
  const result = addMaps(generateAnnotation(maps))
  assert.equal(result.length, 3)
  const width = (i: number) =>
    distance(result[i].localGcps[0], result[i].localGcps[1])
  close(width(1) / width(0), 2, 1e-6)
  close(width(2) / width(0), 1, 1e-6)
  assert.deepEqual(
    result.map((item) => originalAnnotationUrl(item.baseline)),
    maps.map((map) => map.id)
  )
})

test('group rotation preserves each map scale and distances between maps about a shared pivot', () => {
  const items = addMaps(
    generateAnnotation([fixture(0), fixture(52), fixture(70)])
  )
  const pivot: Point = [800, -200]
  const before = items.map(outline)
  const starts = items.map((item) => structuredClone(item.placement))
  items.forEach((item) => {
    item.placement = rotatePlacement(item.placement, pivot, 1.4)
  })
  const after = items.map(outline)
  for (let i = 0; i < items.length; i++) {
    close(
      distance(before[i][0], before[i][1]),
      distance(after[i][0], after[i][1])
    )
    close(distance(pivot, before[i][0]), distance(pivot, after[i][0]))
    close(
      distance(before[0][0], before[i][0]),
      distance(after[0][0], after[i][0])
    )
    const restored = rotatePlacement(items[i].placement, pivot, -1.4)
    close(distance(restored.position, starts[i].position), 0)
    close(restored.rotation, starts[i].rotation)
  }
  const reopened = openCollage(exportCollage(items))
  close(
    distance(outline(reopened[0])[0], outline(reopened[1])[0]),
    distance(after[0][0], after[1][0])
  )
})

test('translation and rotation are rigid and never mutate source GCPs or masks', () => {
  const source = fixture()
  const before = structuredClone(source)
  const [item] = addMaps(generateAnnotation(source))
  const local = structuredClone(item.localGcps)
  item.placement = { position: [15000, -8000], rotation: 1.7 }
  const exported = placedMap(item)
  const projected = exported.gcps.map((gcp) => lonLatToWebMercator(gcp.geo))
  close(distance(projected[0], projected[1]), distance(local[0], local[1]))
  for (let i = 0; i < local.length; i++)
    close(distance(projected[i], place(local[i], item.placement)), 0)
  assert.deepEqual(source, before)
  assert.deepEqual(exported.resourceMask, source.resourceMask)
  assert.deepEqual(
    exported.gcps.map((gcp) => gcp.resource),
    item.baseline.gcps.map((gcp) => gcp.resource)
  )
  assert.equal(exported.gcps.length, 3)
})

test('export and reopen keep positions, orientation, masks, and annotation order', () => {
  const items = addMaps(generateAnnotation([fixture(0), fixture(60)]))
  items[0].placement = { position: [2345, -9876], rotation: 0.83 }
  items[1].placement = { position: [-3000, 7000], rotation: -1.23 }
  items.reverse()
  const exported = exportCollage(items)
  const reopened = openCollage(JSON.parse(JSON.stringify(exported)))
  const twice = exportCollage(reopened)
  assert.deepEqual(
    twice.items.map((item) => item.id),
    exported.items.map((item) => item.id)
  )
  const a = parseAnnotation(exported)
  const b = parseAnnotation(twice)
  for (let i = 0; i < a.length; i++) {
    close(reopened[i].placement.rotation, items[i].placement.rotation)
    assert.deepEqual(a[i].resourceMask, b[i].resourceMask)
    a[i].gcps.forEach((gcp, j) =>
      close(distance(gcp.geo, b[i].gcps[j].geo), 0, 1e-10)
    )
  }
})

test('opening a high-latitude annotation does not normalize or relocate it', () => {
  const original = fixture(70)
  const [item] = openCollage(generateAnnotation(original))
  placedMap(item).gcps.forEach((gcp, i) =>
    close(distance(gcp.geo, original.gcps[i].geo), 0, 1e-10)
  )
})

test('Viewer uses the exact imported URL for every map and retains it through duplication', () => {
  const source = fixture()
  source._allmaps = { id: 'https://example.org/another-annotation' }
  const annotation = generateAnnotation([source, fixture(53)])
  const sourceUrl =
    'https://example.org/annotations?collection=city&version=2#maps'
  const items = solveLayout({
    type: 'add',
    input: annotation,
    at: [0, 0],
    sourceUrl
  }).items
  for (const item of [
    ...items,
    ...duplicateMaps(items, [10, 10]),
    ...openCollage(annotation, sourceUrl)
  ]) {
    const url = new URL(viewerUrl(item)!)
    assert.equal(url.origin, 'https://viewer.allmaps.org')
    assert.equal(url.searchParams.get('url'), sourceUrl)
  }
  const custom = new URL(viewerUrl(items[0], 'http://localhost:5500/')!)
  assert.equal(custom.origin, 'http://localhost:5500')
  assert.equal(custom.searchParams.get('url'), sourceUrl)
  assert.equal(JSON.stringify(exportCollage(items)).includes('sourceUrl'), true)
})

test('Viewer stays disabled for text imports even when annotations contain URLs', () => {
  const source = fixture()
  source._allmaps = { id: source.id, version: source.id + '@1' }
  const annotation = generateAnnotation(source)
  const items = [...prepareMaps(annotation), ...openCollage(annotation)]
  for (const item of items) {
    assert.equal(viewerUrl(item), undefined)
    item.sourceUrl = 'javascript:alert(1)'
    assert.equal(viewerUrl(item), undefined)
    item.sourceUrl = 'file:///tmp/map.json'
    assert.equal(viewerUrl(item), undefined)
  }
  assert.equal(viewerUrl(openCollage(exportCollage(items))[0]), undefined)
})

test('exports preserve individual appearance and rotation without changing provenance', () => {
  const source = fixture()
  const metadata = {
    id: source.id,
    version: source.id + '@1',
    scale: 9.5,
    unrelated: true
  }
  source._allmaps = metadata
  const [item] = addMaps(generateAnnotation(source))
  item.placement.rotation = Math.PI / 4
  item.appearance = {
    applyMask: false,
    opacity: 0.4,
    saturation: 0,
    colorize: true,
    hue: 0.6,
    removeBackground: true,
    backgroundColor: '#eeeedd'
  }
  const exported = exportCollage([item])
  assert.deepEqual(exported.items[0].body._allmaps, {
    ...metadata,
    rotation: 45,
    geographicReference: item.geographicReference,
    collage: { version: 1, appearance: item.appearance }
  })
  assert.deepEqual(Object.keys(exported).sort(), ['@context', 'items', 'type'])
  assert.deepEqual(openCollage(exported)[0].appearance, item.appearance)
  assert.equal(originalAnnotationUrl(item.baseline), source.id + '@1')
})

test('anonymous files retain rotation and geography without requiring source provenance', () => {
  const source = fixture()
  delete source.id
  const annotation = generateAnnotation(source)
  const [anonymous] = addMaps(annotation)
  const serialized = JSON.parse(JSON.stringify(exportCollage([anonymous])))
  assert.deepEqual(serialized.items[0].body._allmaps, {
    rotation: 0,
    geographicReference: anonymous.geographicReference
  })
  const [linked] = addMaps(
    annotation,
    [0, 0],
    'https://example.org/source.json'
  )
  assert.equal(
    originalAnnotationUrl(linked.baseline),
    'https://example.org/source.json'
  )
})

test('legacy annotations without saved rotation use their loaded orientation as zero', () => {
  const [item] = addMaps(generateAnnotation(fixture()))
  item.placement.rotation = 1.2
  const legacy = generateAnnotation(placedMap(item))
  const [loaded] = openCollage(legacy)
  assert.equal(loaded.placement.rotation, 0)
  const before = placedMap(loaded).gcps
  loaded.placement.rotation = 0.7
  loaded.placement.rotation = 0
  assert.deepEqual(placedMap(loaded).gcps, before)
})

test('saved rotation restores zero orientation without an original annotation or changing scale', () => {
  const original = fixture()
  delete original.id
  const [item] = addMaps(generateAnnotation(original))
  item.placement = { position: [4523, -9322], rotation: 1.2 }
  const [loaded] = openCollage(exportCollage([item]))
  const before = structuredClone(loaded.placement.position)
  close(loaded.placement.rotation, 1.2)
  loaded.placement.rotation = 0
  assert.deepEqual(loaded.placement.position, before)
  const points = transformer(placedMap(loaded)).transformToProjectedGeo([
    [0, 0],
    [1000, 0]
  ] as Point[])
  close(points[1][1] - points[0][1], 0)
  close(distance(points[0], points[1]), 1000, 0.001)
  assert.deepEqual(exportCollage([loaded]).items[0].body._allmaps, {
    rotation: 0,
    geographicReference: loaded.geographicReference
  })
  assert.equal(openCollage(exportCollage([loaded]))[0].placement.rotation, 0)
})

test('invalid saved rotation falls back to the loaded orientation without changing geometry', () => {
  for (const rotation of ['45', null, {}, Number.NaN, Infinity]) {
    const original = fixture()
    original._allmaps = { rotation, unrelated: true }
    const [item] = openCollage(generateAnnotation(original))
    assert.equal(item.placement.rotation, 0)
    placedMap(item).gcps.forEach((gcp, i) =>
      close(distance(gcp.geo, original.gcps[i].geo), 0, 1e-10)
    )
  }
})

test('adding an exported map keeps its saved angle and does not apply rotation twice', () => {
  const [item] = addMaps(generateAnnotation(fixture(0)))
  item.placement = { position: [0, 0], rotation: -0.9 }
  const exported = exportCollage([item])
  const [added] = addMaps(exported)
  close(added.placement.rotation, -0.9)
  const expected = normalizeMap(placedMap(item))
  const actual = placedMap(added)
  // Adding relocates the map, but its orientation and relative GCPs stay intact.
  const origin = lonLatToWebMercator(expected.gcps[0].geo)
  const addedOrigin = lonLatToWebMercator(actual.gcps[0].geo)
  actual.gcps.forEach((gcp, i) => {
    const a = lonLatToWebMercator(gcp.geo)
    const b = lonLatToWebMercator(expected.gcps[i].geo)
    close(a[0] - addedOrigin[0], b[0] - origin[0])
    close(a[1] - addedOrigin[1], b[1] - origin[1])
  })
})

test('edited masks and newly resolved full images stay aligned after loading saved rotation', () => {
  for (const type of ['polynomial', 'thinPlateSpline', 'projective'] as const) {
    const source = fixture()
    source.transformation = { type }
    if (type !== 'polynomial') source.gcps[2].geo[0] += 0.001
    const [item] = addMaps(generateAnnotation(source))
    item.placement = { position: [5000, -3000], rotation: 1.3 }
    delete item.baseline.resource.width
    delete item.baseline.resource.height
    const [loaded] = openCollage(exportCollage([item]))
    const gcps = placedMap(loaded).gcps
    resolveImageSize(loaded, 1000, 1000)
    const mask: Point[] = [
      [50, 80],
      [900, 100],
      [800, 950],
      [150, 800]
    ]
    setResourceMask(loaded, mask)
    assert.deepEqual(placedMap(loaded).gcps, gcps)
    for (const applyMask of [true, false]) {
      loaded.appearance.applyMask = applyMask
      const expected = transformer(placedMap(loaded)).transformToProjectedGeo(
        applyMask ? mask : source.resourceMask
      )
      outline(loaded).forEach((point, i) =>
        close(distance(point, expected[i]), 0, 0.01)
      )
    }
    loaded.placement.rotation = 0
    const [reopened] = openCollage(exportCollage([loaded]))
    assert.equal(reopened.appearance.applyMask, false)
    const expected = transformer(placedMap(reopened)).transformToProjectedGeo(
      source.resourceMask
    )
    outline(reopened).forEach((point, i) =>
      close(distance(point, expected[i]), 0, 0.01)
    )
  }
})

test('converted TPS and projective imports reproduce the rigidly transformed Helmert surface', () => {
  for (const type of ['thinPlateSpline', 'projective', 'helmert'] as const) {
    const source = fixture()
    source.transformation = { type }
    if (type !== 'helmert') source.gcps[2].geo[0] += 0.001
    const [item] = addMaps(generateAnnotation(source))
    assert.equal(item.baseline.transformation?.type, 'helmert')
    const before = transformer(placedMap(item))
    const probes: Point[] = [
      [100, 200],
      [500, 500],
      [800, 700]
    ]
    const baseline = probes.map((point) =>
      before.transformToProjectedGeo(point)
    )
    item.placement = { position: [2800, -4300], rotation: 0.4 }
    const after = transformer(placedMap(item))
    probes.forEach((point, i) => {
      close(
        distance(
          after.transformToProjectedGeo(point),
          place(baseline[i], item.placement)
        ),
        0,
        0.01
      )
    })
  }
})

test('repeated round trips do not accumulate scale drift', () => {
  let items = addMaps(generateAnnotation(fixture()))
  const initial = placedMap(items[0]).gcps.map((gcp) =>
    lonLatToWebMercator(gcp.geo)
  )
  for (let i = 0; i < 30; i++) {
    items[0].placement.rotation += 0.37
    items[0].placement.position = [1300, -4000]
    items = openCollage(exportCollage(items))
  }
  const final = placedMap(items[0]).gcps.map((gcp) =>
    lonLatToWebMercator(gcp.geo)
  )
  close(distance(final[0], final[1]), distance(initial[0], initial[1]), 1e-5)
  close(items[0].placement.rotation, 30 * 0.37)
  items[0].placement.rotation = 0
  const reset = placedMap(items[0]).gcps.map((gcp) =>
    lonLatToWebMercator(gcp.geo)
  )
  close(reset[1][1] - reset[0][1], initial[1][1] - initial[0][1])
})

test('a map crossing the antimeridian remains compact on import', () => {
  const source = fixture(30, 179.999)
  source.gcps = source.gcps.map((gcp) => ({
    ...gcp,
    geo: [gcp.geo[0] > 180 ? gcp.geo[0] - 360 : gcp.geo[0], gcp.geo[1]]
  }))
  const [item] = addMaps(generateAnnotation(source))
  close(distance(outline(item)[0], outline(item)[1]), 1000, 0.001)
})

test('selection uses the moved mask and allows overlapping maps to be checked in reverse order', () => {
  const [item] = addMaps(generateAnnotation(fixture()))
  item.placement = { position: [9000, 5000], rotation: 1.4 }
  assert.ok(contains(item.placement.position, outline(item)))
  assert.equal(contains([0, 0], outline(item)), false)
})

test('empty collages round trip as empty annotation pages', () => {
  const exported = exportCollage([])
  assert.deepEqual(exported.items, [])
  assert.deepEqual(openCollage(exported), [])
})

test('custom projections fail; adding approximates transformations that opening cannot preserve', () => {
  const custom = fixture()
  custom.resourceCrs = { definition: 'EPSG:4326' }
  assert.throws(
    () => addMaps(generateAnnotation(custom)),
    /Custom resource projections/
  )
  const straight = fixture()
  straight.transformation = { type: 'straight' }
  assert.throws(
    () => openCollage(generateAnnotation(straight)),
    /cannot encode rotation/
  )
  const higherOrder = fixture()
  higherOrder.transformation = { type: 'polynomial', options: { order: 2 } }
  assert.throws(
    () => openCollage(generateAnnotation(higherOrder)),
    /Higher-order polynomial/
  )
  for (const source of [straight, higherOrder]) {
    const [item] = addMaps(generateAnnotation(source))
    assert.equal(item.baseline.transformation?.type, 'helmert')
    assert.equal(item.baseline.gcps.length, 3)
  }
})

test('mask editing changes the exported polygon without changing placement, GCPs, scale or source', () => {
  const source = fixture(52)
  source.transformation = { type: 'thinPlateSpline' }
  source.gcps[2].geo[0] += 0.001
  const [item] = addMaps(generateAnnotation(source))
  item.placement = { position: [5000, -3000], rotation: 0.6 }
  const before = structuredClone(item)
  const gcps = placedMap(item).gcps
  const mask: Point[] = [
    [50, 20],
    [950, 50],
    [930, 800],
    [600, 970],
    [40, 850]
  ]
  setResourceMask(item, mask)
  assert.deepEqual(placedMap(item).gcps, gcps)
  assert.deepEqual(item.placement, before.placement)
  assert.deepEqual(item.baseline, before.baseline)
  assert.deepEqual(item.localGcps, before.localGcps)
  assert.deepEqual(placedMap(item).resourceMask, mask)
  const transformed = transformer(placedMap(item)).transformToProjectedGeo(mask)
  transformed.forEach((point, i) =>
    close(distance(point, outline(item)[i]), 0, 0.01)
  )
  const [reopened] = openCollage(exportCollage([item]))
  assert.deepEqual(reopened.resourceMask, mask)
  assert.deepEqual(placedMap(reopened).resourceMask, mask)
  item.appearance.applyMask = false
  assert.equal(outline(item).length, 4)
  assert.deepEqual(placedMap(item).resourceMask, mask)
  assert.deepEqual(placedMap(item).gcps, gcps)
  item.appearance.applyMask = true
  assert.equal(outline(item).length, 5)
})

test('organizing a rotated group preserves order, orientation, masks and scale', () => {
  const items = addMaps(
    generateAnnotation([fixture(0), fixture(52), fixture(70)])
  )
  items.forEach((item, i) => {
    item.placement = { position: [100, 200], rotation: i * 0.8 }
  })
  setResourceMask(items[0], [
    [100, 100],
    [900, 100],
    [500, 500]
  ])
  const before = structuredClone(items)
  arrangeMaps(items.slice(0, 2), items[1])
  assert.deepEqual(items[2], before[2])
  items.forEach((item, i) => {
    assert.equal(item.instanceId, before[i].instanceId)
    assert.equal(item.placement.rotation, before[i].placement.rotation)
    assert.deepEqual(item.localGcps, before[i].localGcps)
    assert.deepEqual(item.resourceMask, before[i].resourceMask)
  })
  const extent = (item: (typeof items)[number]) => {
    const points = outline(item)
    return [
      Math.min(...points.map((p) => p[0])),
      Math.min(...points.map((p) => p[1])),
      Math.max(...points.map((p) => p[0])),
      Math.max(...points.map((p) => p[1]))
    ]
  }
  const a = extent(items[0]),
    b = extent(items[1])
  assert.ok(a[0] > b[2] || a[2] < b[0] || a[1] > b[3] || a[3] < b[1])
  assert.deepEqual(items[1].placement, before[1].placement)
})

test('mask validation rejects crossings, duplicates, zero area and vertices outside the image', () => {
  assert.doesNotThrow(() =>
    validateResourceMask(
      [
        [0, 0],
        [100, 0],
        [100, 100],
        [0, 100]
      ],
      100,
      100
    )
  )
  const invalid: Point[][] = [
    [
      [0, 0],
      [100, 100],
      [0, 100],
      [100, 0]
    ],
    [
      [0, 0],
      [100, 0],
      [100, 0],
      [0, 100]
    ],
    [
      [0, 0],
      [20, 20],
      [100, 100]
    ],
    [
      [0, 0],
      [101, 0],
      [0, 100]
    ],
    [
      [0, 0],
      [100, 0]
    ],
    [
      [0, 0],
      [NaN, 0],
      [0, 100]
    ]
  ]
  invalid.forEach((mask) =>
    assert.throws(() => validateResourceMask(mask, 100, 100))
  )
})

test('annotations without image dimensions still import and resolve the full image when needed', () => {
  const source = fixture()
  delete source.resource.width
  delete source.resource.height
  const [item] = addMaps(generateAnnotation(source))
  const gcps = placedMap(item).gcps
  resolveImageSize(item, 1000, 1000)
  item.appearance.applyMask = false
  assert.equal(outline(item).length, 4)
  assert.deepEqual(placedMap(item).gcps, gcps)
})

test('in-place mask coordinates invert the rendered rotated warp without shifting untouched vertices', () => {
  for (const type of ['polynomial', 'thinPlateSpline', 'projective'] as const) {
    const source = fixture()
    source.transformation = { type }
    if (type !== 'polynomial') source.gcps[2].geo[0] += 0.003
    const [item] = addMaps(generateAnnotation(source))
    item.placement = { position: [3200, -2700], rotation: 1.2 }
    const rendered = transformer(placedMap(item))
    const editing = maskCoordinates(item)
    const probes: Point[] = [
      [0, 0],
      [100, 200],
      [850, 900],
      [1200, -300]
    ]
    for (const resource of probes) {
      const geo = webMercatorToLonLat(
        rendered.transformToProjectedGeo(resource)
      )
      const inverse = editing.toResource(geo, [500, 500])
      close(distance(inverse, resource), 0, 0.00001)
      const knownGeo = editing.toGeo(resource)
      assert.deepEqual(editing.toResource(knownGeo), resource)
    }
  }
})

test('dragging a mask vertex outside the image stops at the boundary along its path', () => {
  assert.deepEqual(
    constrainToImage([400, 300], [1200, 700], 1000, 800),
    [1000, 600]
  )
  assert.deepEqual(
    constrainToImage([400, 300], [-400, -300], 1000, 800),
    [0, 0]
  )
  assert.deepEqual(
    constrainToImage([300, 700], [500, 1100], 1000, 800),
    [350, 800]
  )
  assert.deepEqual(constrainToImage([0, 300], [-100, 500], 1000, 800), [0, 300])
  assert.deepEqual(
    constrainToImage([0, 300], [100, 500], 1000, 800),
    [100, 500]
  )
})

test('duplicates preserve the group, masks and appearance with independent IDs and data', () => {
  const items = addMaps(generateAnnotation([fixture(0), fixture(52)]))
  items[0].placement.rotation = 0.75
  items[0].appearance.opacity = 0.4
  items[0].appearance.applyMask = false
  items[0].resourceMask[0] = [20, 20]
  const before = structuredClone(items)
  const copies = duplicateMaps(items, [25, -25])
  assert.deepEqual(items, before)
  for (let i = 0; i < items.length; i++) {
    assert.notEqual(copies[i].instanceId, items[i].instanceId)
    assert.notEqual(copies[i].baseline.id, items[i].baseline.id)
    assert.deepEqual(copies[i].appearance, items[i].appearance)
    assert.deepEqual(copies[i].resourceMask, items[i].resourceMask)
    assert.deepEqual(copies[i].baseline._allmaps, items[i].baseline._allmaps)
    assert.equal(copies[i].placement.rotation, items[i].placement.rotation)
    const source = outline(items[i]),
      duplicate = outline(copies[i])
    source.forEach((point, j) => {
      close(duplicate[j][0] - point[0], 25)
      close(duplicate[j][1] - point[1], -25)
    })
  }
  const reopened = openCollage(exportCollage([...items, ...copies]))
  assert.equal(reopened.length, 4)
  assert.equal(new Set(reopened.map((item) => item.baseline.id)).size, 4)
  copies[0].appearance.opacity = 0.9
  copies[0].resourceMask[0][0] = 100
  copies[0].baseline.gcps[0].geo[0] += 1
  assert.deepEqual(items, before)
})

test('the tool center follows edited masks and stays rigid through rotation without moving GCPs', () => {
  const [item] = addMaps(generateAnnotation(fixture(0)))
  const before = structuredClone(item)
  const originalCenter = mapCenter(item)
  setResourceMask(item, [
    [600, 100],
    [950, 100],
    [950, 700],
    [600, 700]
  ])
  const editedCenter = mapCenter(item)
  assert.ok(distance(originalCenter, editedCenter) > 100)
  const expected = transformer(placedMap(item)).transformToProjectedGeo([
    775, 400
  ])
  close(distance(editedCenter, expected), 0, 0.001)
  assert.deepEqual(placedMap(item).gcps, placedMap(before).gcps)
  const pivot = [...item.placement.position] as Point
  item.placement = rotatePlacement(item.placement, pivot, 0.7)
  close(distance(mapCenter(item), pivot), distance(editedCenter, pivot))
  item.appearance.applyMask = false
  close(distance(mapCenter(item), pivot), 0, 0.001)
})

function geographicAnchor(item: ReturnType<typeof addMaps>[number]): Point {
  return transformer(placedMap(item)).transformToProjectedGeo(
    item.geographicReference!.resource
  )
}

test('geographic arrangement overlaps maps of the same place and fixes the chosen anchor', () => {
  const items = addMaps(generateAnnotation([fixture(), fixture()]))
  items[0].placement = { position: [9000, -5000], rotation: -0.8 }
  items[1].placement = { position: [-3000, 2000], rotation: 1.1 }
  const fixed = structuredClone(items[1])
  arrangeGeographically(items, items[1])
  assert.deepEqual(items[1], fixed)
  close(items[0].placement.rotation, fixed.placement.rotation)
  outline(items[0]).forEach((point, i) =>
    close(distance(point, outline(items[1])[i]), 0, 0.001)
  )
})

test('geographic offsets follow the fixed map rotation and ground scale without changing map scales', () => {
  const items = addMaps(
    generateAnnotation([fixture(52, 5), fixture(52, 5.02), fixture(70, 5)])
  )
  items[1].placement = { position: [3000, 7000], rotation: 0.7 }
  const before = structuredClone(items)
  const ids = items.map((item) => item.instanceId)
  arrangeGeographically(items.slice(0, 2), items[1])
  assert.deepEqual(items[1], before[1])
  assert.deepEqual(items[2], before[2])
  assert.deepEqual(
    items.map((item) => item.instanceId),
    ids
  )
  const a = lonLatToWebMercator(items[0].geographicReference!.geo)
  const b = lonLatToWebMercator(items[1].geographicReference!.geo)
  const factor = items[1].geographicReference!.scale
  const delta = rotate([(a[0] - b[0]) * factor, (a[1] - b[1]) * factor], 0.7)
  const fixed = geographicAnchor(items[1])
  close(
    distance(geographicAnchor(items[0]), [
      fixed[0] + delta[0],
      fixed[1] + delta[1]
    ]),
    0,
    0.001
  )
  items.forEach((item, i) => {
    close(
      distance(outline(item)[0], outline(item)[1]),
      distance(outline(before[i])[0], outline(before[i])[1]),
      0.001
    )
    assert.deepEqual(item.resourceMask, before[i].resourceMask)
  })
})

test('geographic import seed keeps the first map at the requested location and preserves layer order', () => {
  const source = generateAnnotation([fixture(), fixture()])
  const compact = addMaps(source)
  assert.ok(
    distance(geographicAnchor(compact[0]), geographicAnchor(compact[1])) > 100
  )
  const geographic = prepareMaps(source, [4000, 5000])
  assert.deepEqual(geographic[0].placement.position, [4000, 5000])
  close(
    distance(geographicAnchor(geographic[0]), geographicAnchor(geographic[1])),
    0,
    0.001
  )
  assert.deepEqual(
    geographic.map((item) => item.title),
    compact.map((item) => item.title)
  )
})

test('geographic references survive mask edits, duplication, export and re-adding', () => {
  const items = addMaps(generateAnnotation([fixture(), fixture(52, 5.02)]))
  items[0].placement.rotation = 1.4
  items[1].placement.rotation = -0.3
  setResourceMask(items[0], [
    [100, 100],
    [450, 100],
    [450, 700],
    [100, 700]
  ])
  const reopened = openCollage(exportCollage(items))
  assert.deepEqual(
    reopened.map((item) => item.geographicReference),
    items.map((item) => item.geographicReference)
  )
  const target = structuredClone(reopened)
  arrangeGeographically(target)
  const copies = duplicateMaps(reopened, [40, 50])
  const restored = openCollage(exportCollage(reopened))
  arrangeGeographically(restored)
  restored.forEach((item, i) =>
    outline(item).forEach((point, j) =>
      close(distance(point, outline(target[i])[j]), 0, 0.001)
    )
  )
  arrangeGeographically([reopened[0], copies[0]])
  outline(copies[0]).forEach((point, i) =>
    close(distance(point, outline(reopened[0])[i]), 0, 0.001)
  )
  const added = addMaps(exportCollage(items))
  added.forEach((item, i) => {
    assert.deepEqual(
      item.geographicReference!.geo,
      items[i].geographicReference!.geo
    )
    assert.deepEqual(
      item.geographicReference!.resource,
      items[i].geographicReference!.resource
    )
  })
})

test('geographic arrangement takes the short offset across the antimeridian', () => {
  const items = prepareMaps(
    generateAnnotation([fixture(30, 179.999), fixture(30, -179.999)])
  )
  close(
    distance(geographicAnchor(items[0]), geographicAnchor(items[1])),
    0.002 * radians * R * items[0].geographicReference!.scale,
    0.01
  )
})

test('missing or malformed geographic references cannot partially move a selection', () => {
  const [known] = addMaps(generateAnnotation(fixture()))
  const source = fixture()
  for (const geographicReference of [
    undefined,
    { geo: [5, 52], resource: [500, 500], scale: 0 },
    { geo: [5, 95], resource: [500, 500], scale: 1 },
    { geo: ['5', 52], resource: [500, 500], scale: 1 }
  ]) {
    source._allmaps = { geographicReference }
    const [legacy] = openCollage(generateAnnotation(source))
    assert.equal(legacy.geographicReference, undefined)
    const items = [known, legacy]
    const before = structuredClone(items)
    assert.throws(
      () => arrangeGeographically(items),
      /Original geography is unavailable/
    )
    assert.deepEqual(items, before)
  }
})

test('worker layout preserves the input document and produces an atomic, exportable selection', () => {
  const items = addMaps(generateAnnotation([fixture(), fixture(), fixture()]))
  items.forEach((item, i) => {
    item.placement.position = [100, 200]
    item.placement.rotation = i * 0.2
  })
  const before = structuredClone(items)
  const result = solveLayout({
    type: 'arrange',
    items: items.slice(0, 2),
    arrangement: 'compact',
    anchorId: items[1].instanceId
  })
  assert.equal(result.fallback, false)
  assert.deepEqual(items, before)
  assert.deepEqual(result.items[1], items[1])
  assert.notDeepEqual(
    result.items[0].placement.position,
    items[0].placement.position
  )
  const reopened = openCollage(exportCollage(result.items))
  result.items.forEach((item, i) =>
    outline(item).forEach((p, j) =>
      close(distance(p, outline(reopened[i])[j]), 0, 0.01)
    )
  )
})

test('worker import compacts geography, keeps every map and preserves saved rotations', () => {
  const source = addMaps(generateAnnotation([fixture(), fixture(52, 5.1)]))
  source[1].placement.rotation = 0.6
  const input = exportCollage(source)
  const before = structuredClone(input)
  const result = solveLayout({ type: 'add', input, at: [400, 500] })
  assert.equal(result.fallback, false)
  assert.equal(result.items.length, 2)
  assert.deepEqual(input, before)
  assert.deepEqual(result.items[0].placement.position, [400, 500])
  close(result.items[1].placement.rotation, 0.6)
  assert.ok(distance(...(result.items.map(mapCenter) as [Point, Point])) < 8000)
})

test('geographic worker import preserves offsets, scale, grouping and its first anchor', () => {
  const input = generateAnnotation([fixture(), fixture(), fixture(52, 5.02)])
  const before = structuredClone(input)
  const request = { type: 'add' as const, input, at: [400, 500] as Point }
  const compact = solveLayout(request)
  const geographic = solveLayout({ ...request, arrangement: 'geographic' })
  assert.equal(geographic.fallback, false)
  assert.equal(geographic.items.length, 3)
  assert.deepEqual(input, before)
  assert.deepEqual(geographic.items[0].placement.position, request.at)
  close(
    distance(mapCenter(geographic.items[0]), mapCenter(geographic.items[1])),
    0
  )
  assert.ok(
    distance(mapCenter(compact.items[0]), mapCenter(compact.items[1])) > 100
  )
  assert.ok(geographic.items[2].placement.position[0] > request.at[0] + 1000)
  assert.ok(geographic.items[0].groupId)
  for (const item of geographic.items) {
    assert.equal(item.groupId, geographic.items[0].groupId)
    const polygon = outline(item)
    close(distance(polygon[0], polygon[1]), 1000, 1)
  }
  const search = solveLayout({
    ...request,
    arrangement: 'geographic',
    groupImportedMaps: false
  })
  assert.ok(search.items.every((item) => !item.groupId))
})

test('vertical mirror reflects image Y and survives export, reversal and horizontal composition', () => {
  const [item] = addMaps(generateAnnotation(bearingFixture(37)))
  item.placement = { position: [5000, -6000], rotation: 0.8 }
  const before = structuredClone(item)
  const original = transformer(placedMap(item))
  mirrorMap(item, 'vertical')
  close(distance(mapCenter(item), mapCenter(before)), 0)
  const reflected = transformer(placedMap(item))
  for (const p of [
    [0, 0],
    [123, 456],
    [1000, 1000]
  ] as Point[]) {
    close(
      distance(
        reflected.transformToProjectedGeo(p),
        original.transformToProjectedGeo([p[0], 1000 - p[1]])
      ),
      0
    )
  }
  const [loaded] = openCollage(exportCollage([item]))
  mirrorMap(loaded, 'vertical')
  outline(loaded).forEach((p, i) => close(distance(p, outline(before)[i]), 0))
  mirrorMap(item, 'horizontal')
  const both = transformer(placedMap(item))
  close(
    distance(
      both.transformToProjectedGeo([123, 456]),
      original.transformToProjectedGeo([877, 544])
    ),
    0
  )
  assert.equal(item.baseline.transformation?.type, 'helmert')
  assert.deepEqual(item.resourceMask, before.resourceMask)
})

function polygonArea(points: Point[]) {
  return (
    Math.abs(
      points.reduce((sum, point, index) => {
        const next = points[(index + 1) % points.length]
        return sum + point[0] * next[1] - next[0] * point[1]
      }, 0)
    ) / 2
  )
}

test('skew uses three affine GCPs, preserves area and center, and resets exactly to Helmert', () => {
  const [item] = addMaps(generateAnnotation(fixture()))
  item.placement.rotation = 0.7
  item.placement.position = [12000, -4000]
  const initial = structuredClone(item)
  const initialOutline = outline(item)
  for (const [horizontal, vertical] of [
    [0.6, 0],
    [0, -0.8],
    [1, 1],
    [-1, -1],
    [0.5, -0.4]
  ]) {
    setSkew(item, horizontal, vertical)
    assert.equal(item.baseline.gcps.length, 3)
    assert.equal(item.baseline.transformation?.type, 'polynomial')
    close(distance(mapCenter(item), mapCenter(initial)), 0)
    close(polygonArea(outline(item)) / polygonArea(initialOutline), 1)
    const rendered = transformer(placedMap(item)).transformToProjectedGeo(
      item.resourceMask
    )
    rendered.forEach((point, i) => close(distance(point, outline(item)[i]), 0))
  }
  setSkew(item, 0, 0)
  assert.equal(item.baseline.transformation?.type, 'helmert')
  assert.deepEqual(item.baseline.gcps, initial.baseline.gcps)
  outline(item).forEach((point, i) =>
    close(distance(point, initialOutline[i]), 0)
  )
  close(item.placement.rotation, initial.placement.rotation)
  assert.deepEqual(item.affine?.values, {
    scaleX: 1,
    scaleY: 1,
    skewX: 0,
    skewY: 0
  })
})

test('skew survives mask edits, duplication, annotation export/reopen and mirroring', () => {
  const [item] = addMaps(generateAnnotation(fixture()))
  const original = structuredClone(item)
  const crop: Point[] = [
    [100, 100],
    [700, 200],
    [800, 600],
    [200, 900]
  ]
  setSkew(item, 0.5, -0.3)
  setResourceMask(item, crop)
  const [copy] = duplicateMaps([item], [250, 100])
  assert.deepEqual(copy.affine, item.affine)
  const copyId = copy.baseline.id
  setSkew(copy, 0, 0)
  assert.equal(copy.baseline.id, copyId)
  assert.notEqual(copy.baseline.id, item.baseline.id)
  const [reopened] = openCollage(exportCollage([item]))
  outline(reopened).forEach((point, i) =>
    close(distance(point, outline(item)[i]), 0)
  )
  assert.equal(reopened.affine?.values.skewX, 0.5)
  assert.equal(reopened.affine?.values.skewY, -0.3)
  mirrorMap(item)
  assert.equal(item.mirrored, true)
  setSkew(item, 0, 0)
  assert.equal(item.mirrored, true)
  setResourceMask(original, crop)
  mirrorMap(original)
  // A mask edit changes the visible pivot. Reset retains that pivot and shape.
  const a = outline(item),
    b = outline(original)
  a.forEach((point, i) =>
    close(
      distance(
        [point[0] - a[0][0], point[1] - a[0][1]],
        [b[i][0] - b[0][0], b[i][1] - b[0][1]]
      ),
      0
    )
  )
  mirrorMap(item)
  assert.equal(item.baseline.transformation?.type, 'helmert')
  assert.throws(() => setSkew(item, NaN, 0), /transformation/)
})

test('mirroring a skewed map reflects its existing shape, and double reflection restores it', () => {
  const [source] = addMaps(generateAnnotation(fixture()))
  setSkew(source, 0.6, -0.4)
  const before = transformer(placedMap(source))
  for (const direction of ['horizontal', 'vertical'] as const) {
    const item = structuredClone(source)
    mirrorMap(item, direction)
    const after = transformer(placedMap(item))
    for (const resource of [
      [200, 300],
      [700, 100],
      [450, 900]
    ] as Point[]) {
      const reflected: Point =
        direction === 'horizontal'
          ? [1000 - resource[0], resource[1]]
          : [resource[0], 1000 - resource[1]]
      close(
        distance(
          after.transformToProjectedGeo(resource),
          before.transformToProjectedGeo(reflected)
        ),
        0
      )
    }
    mirrorMap(item, direction)
    outline(item).forEach((point, i) =>
      close(distance(point, outline(source)[i]), 0)
    )
  }
})

test('polynomial imports preserve the full affine fit and initialize scales and both skew factors', () => {
  const source = affineFixture()
  const fit = transformer(source)
  const pivot = center(fit.transformToProjectedGeo(source.resourceMask))
  const groundScale = Math.cos(webMercatorToLonLat(pivot)[1] * radians)
  const [item] = prepareMaps(
    generateAnnotation(source),
    [0, 0],
    undefined,
    'polynomial'
  )
  assert.equal(item.baseline.transformation?.type, 'polynomial')
  assert.equal(item.baseline.gcps.length, 3)
  assert.ok(Math.abs(item.affine!.values.skewX) > 0.01)
  const actual = transformer(item.baseline)
  for (const resource of [
    [0, 0],
    [1000, 1000],
    [127, 632]
  ] as Point[]) {
    const original = fit.transformToProjectedGeo(resource)
    close(
      distance(actual.transformToProjectedGeo(resource), [
        (original[0] - pivot[0]) * groundScale,
        (original[1] - pivot[1]) * groundScale
      ]),
      0
    )
  }
  setSkew(item, 0, 0)
  const unskewed = transformer(item.baseline)
  const [c, x, y] = unskewed.transformToProjectedGeo([
    [0, 0],
    [100, 0],
    [0, 100]
  ] as Point[])
  close(
    ((x[0] - c[0]) * (y[0] - c[0]) + (x[1] - c[1]) * (y[1] - c[1])) /
      (distance(x, c) * distance(y, c)),
    0
  )
  assert.equal(
    prepareMaps(generateAnnotation(source))[0].baseline.transformation?.type,
    'helmert'
  )
  source.gcps = source.gcps.slice(0, 2)
  assert.equal(
    prepareMaps(generateAnnotation(source), [0, 0], undefined, 'polynomial')[0]
      .baseline.transformation?.type,
    'helmert'
  )
})

test('multi-map annotation imports receive a fresh group without changing individual settings', () => {
  const sources = [fixture(), fixture(53)]
  sources[0]._allmaps = {
    collage: { version: 1, locked: true, appearance: { opacity: 0.25 } }
  }
  sources[1]._allmaps = {
    collage: { version: 1, appearance: { saturation: 0 } }
  }
  const input = generateAnnotation(sources)
  const before = structuredClone(input)
  const items = prepareMaps(input)
  assert.ok(items[0].groupId)
  assert.equal(items[0].groupId, items[1].groupId)
  assert.notEqual(prepareMaps(input)[0].groupId, items[0].groupId)
  assert.equal(items[0].locked, true)
  assert.equal(items[0].appearance.opacity, 0.25)
  assert.equal(items[1].appearance.saturation, 0)
  assert.equal(
    prepareMaps(generateAnnotation(sources[0]))[0].groupId,
    undefined
  )
  assert.ok(openCollage(input).every((item) => !item.groupId))
  assert.deepEqual(input, before)
})

test('a multi-file worker import groups each document separately and leaves single maps ungrouped', () => {
  const input = generateAnnotation([fixture(), fixture(52, 5.1)])
  const additionalInputs = [input, generateAnnotation(fixture(52, 5.2))]
  const before = structuredClone({ input, additionalInputs })
  const { items } = solveLayout({
    type: 'add',
    input,
    additionalInputs,
    at: [0, 0]
  })
  assert.equal(items.length, 5)
  assert.ok(items[0].groupId)
  assert.equal(items[0].groupId, items[1].groupId)
  assert.equal(items[2].groupId, items[3].groupId)
  assert.notEqual(items[0].groupId, items[2].groupId)
  assert.equal(items[4].groupId, undefined)
  assert.deepEqual({ input, additionalInputs }, before)
})

test('saved group structure survives adding annotations and never joins another imported document', () => {
  const sources = [fixture(), fixture(), fixture(), fixture()]
  for (const [i, groupId] of ['a', 'a', 'b'].entries())
    sources[i]._allmaps = { collage: { version: 1, groupId } }
  const input = generateAnnotation(sources)
  const items = prepareMaps(input, [0, 0], undefined, 'helmert', {
    additionalInputs: [input]
  })
  assert.equal(items[0].groupId, items[1].groupId)
  assert.notEqual(items[0].groupId, 'a')
  assert.ok(items[2].groupId)
  assert.notEqual(items[2].groupId, items[0].groupId)
  assert.equal(items[3].groupId, undefined)
  assert.notEqual(items[0].groupId, items[4].groupId)
  assert.equal(items[4].groupId, items[5].groupId)
  assert.equal(items[7].groupId, undefined)
})

test('synthetic random and search batches can opt out of automatic grouping', () => {
  const { items } = solveLayout({
    type: 'add',
    input: generateAnnotation([fixture(), fixture(53)]),
    at: [0, 0],
    groupImportedMaps: false
  })
  assert.ok(items.every((item) => !item.groupId))
})

test('annotation round-trips retain distinct settings, groups, locks, reset masks and skew reset', () => {
  const items = prepareMaps(generateAnnotation([fixture(), fixture(53)]))
  items.forEach((item) => {
    item.groupId = 'test-group'
    item.locked = true
  })
  items[0].appearance.opacity = 0.25
  items[1].appearance.colorize = true
  items[1].appearance.hue = 0.8
  items[0].title = 'My map'
  items[0].sourceUrl = 'https://example.org/import.json'
  const before = structuredClone(items[0])
  setSkew(items[0], 1.5, -0.3)
  setResourceMask(items[0], [
    [100, 100],
    [700, 100],
    [700, 800],
    [100, 800]
  ])
  const exported = exportCollage(items)
  const loaded = openCollage(JSON.parse(JSON.stringify(exported)))
  loaded.forEach((item, i) => {
    assert.equal(item.groupId, items[i].groupId)
    assert.equal(item.locked, true)
    assert.deepEqual(item.appearance, items[i].appearance)
    outline(item).forEach((point, j) =>
      close(distance(point, outline(items[i])[j]), 0)
    )
  })
  assert.equal(loaded[0].title, 'My map')
  assert.equal(loaded[0].sourceUrl, items[0].sourceUrl)
  assert.deepEqual(loaded[0].originalResourceMask, before.resourceMask)
  assert.equal(loaded[0].affine?.values.skewX, 1.5)
  setSkew(loaded[0], 0, 0)
  assert.equal(loaded[0].baseline.transformation?.type, 'helmert')
  const restored = transformer(placedMap(loaded[0]))
  const original = transformer(placedMap(before))
  const a = restored.transformToProjectedGeo([
    [0, 0],
    [100, 0]
  ] as Point[])
  const b = original.transformToProjectedGeo([
    [0, 0],
    [100, 0]
  ] as Point[])
  close(distance(a[0], a[1]), distance(b[0], b[1]))
  const imported = prepareMaps(exported)
  const importedAgain = prepareMaps(exported)
  assert.equal(imported[0].groupId, imported[1].groupId)
  assert.notEqual(imported[0].groupId, items[0].groupId)
  assert.notEqual(imported[0].groupId, importedAgain[0].groupId)
  loaded.forEach((item) => {
    delete item.groupId
    item.locked = false
  })
  openCollage(exportCollage(loaded)).forEach((item) => {
    assert.equal(item.groupId, undefined)
    assert.equal(item.locked, undefined)
  })
})

test('malformed optional collage metadata does not corrupt legacy geometry or defaults', () => {
  const map = fixture()
  map._allmaps = {
    collage: {
      version: 1,
      appearance: {
        opacity: '0.4',
        hue: -1,
        saturation: 9,
        colorize: 'yes',
        backgroundColor: 'url(bad)'
      },
      locked: 'true',
      groupId: {},
      originalResourceMask: [
        [0, 0],
        [1, 1],
        [0, 1],
        [1, 0]
      ],
      sourceUrl: 'javascript:alert(1)',
      transform: {
        values: { scaleX: 1, scaleY: 1, skewX: 1e300, skewY: 1e300 },
        imported: { scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 },
        polynomial: true
      }
    }
  }
  const [item] = openCollage(generateAnnotation(map))
  assert.equal(item.appearance.opacity, 1)
  assert.equal(item.appearance.hue, 0)
  assert.equal(item.appearance.colorize, false)
  assert.equal(item.appearance.backgroundColor, undefined)
  assert.equal(item.locked, undefined)
  assert.equal(item.groupId, undefined)
  assert.equal(item.originalResourceMask, undefined)
  assert.equal(item.sourceUrl, undefined)
  close(item.affine!.values.scaleX, 1)
  close(item.affine!.values.scaleY, 1)
  close(item.affine!.values.skewX, 0)
  close(item.affine!.values.skewY, 0)
})

test('transform resets preserve imported affine values, location, orientation and export state', () => {
  const [item] = prepareMaps(
    generateAnnotation(affineFixture()),
    [2000, -8000],
    undefined,
    'polynomial'
  )
  item.placement.rotation = 0.8
  const imported = structuredClone(ensureMapTransform(item).values)
  assert.ok(Math.abs(imported.skewX) > 0.01)
  assert.ok(Math.abs(imported.skewY) > 0.01)
  assert.ok(Math.abs(imported.scaleX - 1) > 0.01)
  const originalOutline = outline(item)
  const pivot = mapCenter(item)
  setMapTransform(item, { scaleX: 1.8, scaleY: 0.65, skewX: 0.2, skewY: -0.3 })
  close(distance(mapCenter(item), pivot), 0)
  const [reopened] = openCollage(exportCollage([item]))
  assert.deepEqual(reopened.affine!.imported, imported)
  assert.deepEqual(reopened.affine!.values, item.affine!.values)
  resetMapTransform(reopened)
  outline(reopened).forEach((point, i) =>
    close(distance(point, originalOutline[i]), 0)
  )
  resetMapTransform(reopened, true)
  assert.equal(reopened.baseline.transformation?.type, 'helmert')
  close(polygonArea(outline(reopened)) / polygonArea(originalOutline), 1)
  close(distance(mapCenter(reopened), pivot), 0)
  close(reopened.placement.rotation, 0.8)
  resetMapTransform(reopened)
  outline(reopened).forEach((point, i) =>
    close(distance(point, originalOutline[i]), 0)
  )
})

test('transform scale and skew keep the opposite resource anchor fixed, including after reflection and mask edits', () => {
  const [item] = prepareMaps(generateAnnotation(fixture()))
  mirrorMap(item)
  assert.equal(ensureMapTransform(item).polynomial, false)
  item.placement.rotation = 1.1
  setResourceMask(item, [
    [100, 200],
    [800, 200],
    [800, 900],
    [100, 900]
  ])
  const anchor: Point = [100, 900]
  const fixed = transformer(placedMap(item)).transformToProjectedGeo(anchor)
  const initialArea = polygonArea(outline(item))
  setMapTransform(
    item,
    { scaleX: 1.6, scaleY: 0.7, skewX: 0.4, skewY: -0.25 },
    anchor
  )
  close(
    distance(
      transformer(placedMap(item)).transformToProjectedGeo(anchor),
      fixed
    ),
    0
  )
  close(polygonArea(outline(item)) / initialArea, 1.6 * 0.7)
  assert.equal(item.mirrored, true)
  const before = structuredClone(item)
  assert.throws(() =>
    setMapTransform(item, { scaleX: 0, scaleY: 1, skewX: 0, skewY: 0 })
  )
  assert.deepEqual(item, before)
  mirrorMap(item)
  resetMapTransform(item)
  assert.equal(item.mirrored, false)
})

test('isometric maps have equal axis scale and 30-degree edges, preserving area, center and reflection', () => {
  for (const alternate of [false, true])
    for (const mirrored of [false, true]) {
      for (const importType of ['helmert', 'polynomial'] as const) {
        const [item] = prepareMaps(
          generateAnnotation(affineFixture()),
          [2000, -8000],
          undefined,
          importType
        )
        if (mirrored) mirrorMap(item)
        item.placement.rotation = 2.1
        setResourceMask(item, [
          [80, 110],
          [930, 150],
          [800, 900],
          [130, 750]
        ])
        setMapTransform(item, {
          scaleX: 1.8,
          scaleY: 0.7,
          skewX: 0.5,
          skewY: -0.2
        })
        const before = structuredClone(item)
        const area = polygonArea(outline(item))
        const pivot = mapCenter(item)
        const viewAngle = 0.4
        makeIsometric(item, viewAngle, alternate)
        close(polygonArea(outline(item)) / area, 1)
        close(distance(mapCenter(item), pivot), 0)
        assert.equal(item.mirrored, mirrored)
        assert.deepEqual(item.affine!.imported, before.affine!.imported)
        const [origin, px, py] = transformer(
          placedMap(item)
        ).transformToProjectedGeo([
          [0, 0],
          [100, 0],
          [0, 100]
        ] as Point[])
        const x: Point = [px[0] - origin[0], px[1] - origin[1]]
        const y: Point = [py[0] - origin[0], py[1] - origin[1]]
        close(Math.hypot(...x) / Math.hypot(...y), 1)
        close(
          (x[0] * y[0] + x[1] * y[1]) / (Math.hypot(...x) * Math.hypot(...y)),
          alternate ? 0.5 : -0.5
        )
        close(
          Math.atan2(x[1], x[0]),
          viewAngle +
            ((alternate ? 1 : -1) * ((mirrored ? 5 : 1) * Math.PI)) / 6
        )
        const first = outline(item)
        makeIsometric(item, viewAngle, alternate)
        outline(item).forEach((point, i) => close(distance(point, first[i]), 0))
        const [reopened] = openCollage(exportCollage([item]))
        outline(reopened).forEach((point, i) =>
          close(distance(point, first[i]), 0)
        )
        resetMapTransform(reopened)
        assert.deepEqual(reopened.affine!.values, before.affine!.imported)
      }
    }
})
