import assert from 'node:assert/strict'
import { test } from 'node:test'
import { generateAnnotation, parseAnnotation } from '@allmaps/annotation'
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
  transformer,
  contains,
  outline,
  mapCenter,
  rotatePlacement,
  rotate,
  arrangeMaps,
  arrangeGeographically,
  duplicateMaps,
  setResourceMask,
  validateResourceMask,
  resolveImageSize
} from '../src/lib/model.ts'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { Point } from '@allmaps/types'

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
    source.gcps.map((gcp) => gcp.resource)
  )
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

test('exports record rotation while preserving provenance and omitting other UI state', () => {
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
    geographicReference: item.geographicReference
  })
  assert.deepEqual(Object.keys(exported).sort(), ['@context', 'items', 'type'])
  assert.equal(JSON.stringify(exported).includes('"collage"'), false)
  assert.equal(JSON.stringify(exported).includes('"appearance"'), false)
  assert.deepEqual(openCollage(exported)[0].appearance, {
    applyMask: true,
    opacity: 1,
    saturation: 1,
    colorize: false,
    hue: 0,
    removeBackground: false
  })
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
  const points = placedMap(loaded).gcps.map((gcp) =>
    lonLatToWebMercator(gcp.geo)
  )
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
    const expected = transformer(placedMap(reopened)).transformToProjectedGeo(
      mask
    )
    outline(reopened).forEach((point, i) =>
      close(distance(point, expected[i]), 0, 0.01)
    )
  }
})

test('nonlinear TPS and projective rendering reproduce the rigidly transformed surface', () => {
  for (const type of ['thinPlateSpline', 'projective', 'helmert'] as const) {
    const source = fixture()
    source.transformation = { type }
    if (type !== 'helmert') source.gcps[2].geo[0] += 0.001
    const [item] = addMaps(generateAnnotation(source))
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
  close(distance(item.localGcps[0], item.localGcps[1]), 1000, 0.001)
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

test('unsupported projections and unrepresentable rotations fail explicitly', () => {
  const custom = fixture()
  custom.resourceCrs = { definition: 'EPSG:4326' }
  assert.throws(
    () => addMaps(generateAnnotation(custom)),
    /Custom resource projections/
  )
  const straight = fixture()
  straight.transformation = { type: 'straight' }
  assert.throws(
    () => addMaps(generateAnnotation(straight)),
    /cannot encode rotation/
  )
  const higherOrder = fixture()
  higherOrder.transformation = { type: 'polynomial', options: { order: 2 } }
  assert.throws(
    () => addMaps(generateAnnotation(higherOrder)),
    /Higher-order polynomial/
  )
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
