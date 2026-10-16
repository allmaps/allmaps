import assert from 'node:assert/strict'
import { test } from 'node:test'
import { generateAnnotation } from '@allmaps/annotation'
import type { GeoreferencedMap } from '@allmaps/annotation'
import { webMercatorToLonLat } from '@allmaps/project'
import type { Point } from '@allmaps/types'
import {
  createSelectionTransform,
  openCollage,
  exportCollage,
  placedMap,
  transformer,
  outline,
  mapCenter,
  rotate,
  mirrorMap,
  rotatePlacement,
  resetMapTransform,
  setMapTransform,
  makeIsometric,
  makeSelectionIsometric,
  resetSelectionTransform,
  ensureMapTransform,
  setResourceMask
} from '../src/lib/model.ts'
import { bounds } from '../src/lib/geometry.ts'

function close(a: Point, b: Point, tolerance = 1e-5) {
  assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < tolerance, `${a} != ${b}`)
}
function series() {
  return openCollage(
    generateAnnotation(
      Array.from({ length: 4 }, (_, i): GeoreferencedMap => {
        const mask: Point[] = [
          [0, 0],
          [1000, 0],
          [1000, 1000],
          [0, 1000]
        ]
        return {
          type: 'GeoreferencedMap',
          id: `https://example.org/map/${i}`,
          resource: {
            id: `https://example.org/image/${i}`,
            type: 'ImageService2',
            width: 1000,
            height: 1000
          },
          resourceMask: mask,
          gcps: mask.map((resource) => ({
            resource,
            geo: webMercatorToLonLat([
              (i % 2) * 1000 + resource[0],
              -Math.floor(i / 2) * 1000 - resource[1]
            ])
          })),
          transformation: { type: 'helmert' }
        }
      })
    )
  )
}
function area(points: Point[]) {
  return Math.abs(
    points.reduce((sum, p, i) => {
      const q = points[(i + 1) % points.length]
      return sum + p[0] * q[1] - p[1] * q[0]
    }, 0) / 2
  )
}

test('both isometric directions transform adjoining sheets as one plane and round-trip', () => {
  const items = series()
  items.forEach((item, i) => {
    item.groupId = 'atlas'
    item.appearance.opacity = (i + 1) / 4
  })
  const unchanged = structuredClone(items)
  const session = createSelectionTransform(items)
  for (const alternate of [false, true]) {
    const frame = structuredClone(session.frame)
    makeIsometric(frame, 0, alternate)
    const result = session.apply(frame)
    const transforms = result.map((item) => transformer(placedMap(item)))
    for (const y of [0, 200, 1000]) {
      close(
        transforms[0].transformToProjectedGeo([1000, y]),
        transforms[1].transformToProjectedGeo([0, y])
      )
      close(
        transforms[2].transformToProjectedGeo([1000, y]),
        transforms[3].transformToProjectedGeo([0, y])
      )
    }
    for (const x of [0, 300, 1000])
      close(
        transforms[0].transformToProjectedGeo([x, 1000]),
        transforms[2].transformToProjectedGeo([x, 0])
      )
    assert.ok(
      Math.abs(area(outline(frame)) / area(outline(session.frame)) - 1) < 1e-8
    )
    close(mapCenter(frame), mapCenter(session.frame))
    const corners = outline(frame)
    const angle = Math.atan2(
      corners[1][1] - corners[0][1],
      corners[1][0] - corners[0][0]
    )
    assert.ok(Math.abs(angle - ((alternate ? 1 : -1) * Math.PI) / 6) < 1e-8)
    const reopened = openCollage(exportCollage(result))
    result.forEach((item, i) => {
      assert.equal(item.groupId, items[i].groupId)
      assert.deepEqual(item.appearance, items[i].appearance)
      assert.deepEqual(item.resourceMask, items[i].resourceMask)
      assert.deepEqual(
        item.affine!.imported,
        ensureMapTransform(structuredClone(items[i])).imported
      )
      outline(item).forEach((p, j) => close(p, outline(reopened[i])[j]))
      // Applying the saved current values must not change the geometry.
      const reset = structuredClone(item)
      setMapTransform(reset, reset.affine!.values)
      outline(reset).forEach((p, j) => close(p, outline(item)[j]))
      resetMapTransform(reset)
      assert.ok(Math.abs(area(outline(reset)) - area(outline(items[i]))) < 0.01)
    })
  }
  assert.deepEqual(items, unchanged)
})

test('a common affine mapping preserves differently rotated, reflected and cropped maps', () => {
  const items = series()
  mirrorMap(items[1])
  items[1].placement.rotation = 2.4
  setMapTransform(items[2], {
    scaleX: 1.4,
    scaleY: 0.6,
    skewX: 0.4,
    skewY: -0.6
  })
  items[2].placement.rotation = -1.7
  items[3].appearance.applyMask = false
  const session = createSelectionTransform(items)
  const [left, , , top] = bounds(items.flatMap(outline))
  const frame = structuredClone(session.frame)
  setMapTransform(
    frame,
    { scaleX: 2, scaleY: 0.4, skewX: 6, skewY: -0.3 },
    [0, 0]
  )
  frame.placement = rotatePlacement(frame.placement, mapCenter(frame), 1.2)
  frame.placement.position[0] += 300
  const mapping = transformer(placedMap(frame))
  const result = session.apply(frame)
  result.forEach((item, i) => {
    const before = transformer(placedMap(items[i]))
    const after = transformer(placedMap(item))
    for (const resource of [
      [0, 0],
      [280, 790],
      [1000, 1000]
    ] as Point[]) {
      const point = before.transformToProjectedGeo(resource)
      const expected = mapping.transformToProjectedGeo([
        point[0] - left,
        top - point[1]
      ])
      close(after.transformToProjectedGeo(resource), expected)
    }
    assert.equal(item.mirrored, items[i].mirrored)
    const reset = structuredClone(item)
    setMapTransform(reset, reset.affine!.values)
    outline(reset).forEach((p, j) => close(p, outline(item)[j]))
  })
  resetMapTransform(frame)
  const restored = session.apply(frame)
  restored.forEach((item, i) =>
    assert.ok(
      Math.abs(area(outline(item)) / area(outline(items[i])) - 1) < 1e-8
    )
  )
})

test('legacy two-GCP Helmert maps gain a third fitted point for selection shear', () => {
  const items = series()
  const old = exportCollage(items)
  const maps = openCollage(old)
  // The first edge alone suffices for Helmert; the session samples the fit.
  maps.forEach((item) => {
    item.baseline.gcps = item.baseline.gcps.slice(0, 2)
    item.localGcps = item.localGcps.slice(0, 2)
  })
  const session = createSelectionTransform(maps)
  const frame = structuredClone(session.frame)
  makeIsometric(frame)
  session.apply(frame).forEach((item) => {
    assert.equal(item.baseline.gcps.length, 3)
    assert.equal(item.baseline.transformation?.type, 'polynomial')
    const render = transformer(placedMap(item)).transformToProjectedGeo(
      item.resourceMask
    )
    render.forEach((p, i) => close(p, outline(item)[i]))
  })
  maps[0].locked = true
  assert.throws(() => createSelectionTransform(maps), /unlocked/)
})

for (const alternate of [false, true]) {
  test(`reset restores shapes and sheet spacing after closing/reopening ${alternate ? 'right' : 'left'} isometric transform`, () => {
    const items = series()
    items.forEach((item) => {
      item.groupId = 'atlas'
    })
    const session = createSelectionTransform(items)
    const frame = structuredClone(session.frame)
    makeIsometric(frame, 0, alternate)
    const saved = session.apply(frame)
    for (const input of [saved, openCollage(exportCollage(saved))]) {
      const reopened = createSelectionTransform(input)
      outline(reopened.frame).forEach((point, i) =>
        close(point, outline(frame)[i])
      )
      const reset = structuredClone(reopened.frame)
      resetMapTransform(reset)
      const restored = reopened.apply(reset)
      restored.forEach((item, i) => {
        outline(item).forEach((point, j) => close(point, outline(items[i])[j]))
        assert.equal(item.groupId, items[i].groupId)
        assert.deepEqual(item.appearance, items[i].appearance)
        assert.deepEqual(item.resourceMask, items[i].resourceMask)
      })
      // Reopening an already reset selection must not apply the inverse twice.
      const again = createSelectionTransform(restored)
      const againFrame = structuredClone(again.frame)
      resetMapTransform(againFrame)
      again
        .apply(againFrame)
        .forEach((item, i) =>
          outline(item).forEach((point, j) =>
            close(point, outline(restored[i])[j])
          )
        )
    }
  })
}

test('reopened reset preserves preexisting individual distortions and spans multiple sessions', () => {
  const items = series()
  mirrorMap(items[1])
  items[1].placement.rotation = 2.4
  setMapTransform(items[2], {
    scaleX: 1.4,
    scaleY: 0.6,
    skewX: 0.4,
    skewY: -0.6
  })
  items[2].placement.rotation = -1.7
  const session = createSelectionTransform(items)
  const frame = structuredClone(session.frame)
  makeIsometric(frame)
  const saved = session.apply(frame)
  const reopened = createSelectionTransform(saved)
  const resized = structuredClone(reopened.frame)
  setMapTransform(resized, {
    ...resized.affine!.values,
    scaleX: 1.5,
    skewX: 0.4
  })
  const third = createSelectionTransform(reopened.apply(resized))
  const reset = structuredClone(third.frame)
  resetMapTransform(reset)
  third.apply(reset).forEach((item, i) => {
    outline(item).forEach((point, j) => close(point, outline(items[i])[j]))
    assert.equal(item.mirrored, items[i].mirrored)
    assert.deepEqual(
      item.affine!.imported,
      ensureMapTransform(structuredClone(items[i])).imported
    )
  })
})

test('shared reset follows later movement and rotation without restoring old positions', () => {
  const items = series()
  const session = createSelectionTransform(items)
  const frame = structuredClone(session.frame)
  const pivot = mapCenter(frame)
  makeIsometric(frame)
  const saved = session.apply(frame)
  const angle = 0.7
  const offset: Point = [3000, -2000]
  saved.forEach((item) => {
    item.placement = rotatePlacement(item.placement, pivot, angle)
    item.placement.position = item.placement.position.map(
      (v, i) => v + offset[i]
    ) as Point
  })
  const reopened = createSelectionTransform(saved)
  const reset = structuredClone(reopened.frame)
  resetMapTransform(reset)
  reopened.apply(reset).forEach((item, i) => {
    outline(items[i]).forEach((point, j) => {
      const rotated = rotate([point[0] - pivot[0], point[1] - pivot[1]], angle)
      close(outline(item)[j], [
        rotated[0] + pivot[0] + offset[0],
        rotated[1] + pivot[1] + offset[1]
      ])
    })
  })
})

test('individual shape edits invalidate stale shared reset state', () => {
  const session = createSelectionTransform(series())
  const frame = structuredClone(session.frame)
  makeIsometric(frame)
  const saved = session.apply(frame)
  assert.ok(saved.every((item) => item.selectionTransform))
  setMapTransform(saved[0], { scaleX: 2, scaleY: 1, skewX: 0, skewY: 0 })
  mirrorMap(saved[1])
  assert.equal(saved[0].selectionTransform, undefined)
  assert.equal(saved[1].selectionTransform, undefined)
  const reopened = createSelectionTransform(saved)
  const reset = structuredClone(reopened.frame)
  resetMapTransform(reset)
  reopened
    .apply(reset)
    .forEach((item, i) =>
      outline(item).forEach((point, j) => close(point, outline(saved[i])[j]))
    )
})

test('older isometric collages recover a shared reset from per-map transform values', () => {
  const items = series()
  const session = createSelectionTransform(items)
  const frame = structuredClone(session.frame)
  makeIsometric(frame)
  const saved = session.apply(frame)
  saved.forEach((item) => {
    delete item.selectionTransform
  })
  const reopened = createSelectionTransform(openCollage(exportCollage(saved)))
  const reset = structuredClone(reopened.frame)
  resetMapTransform(reset)
  reopened
    .apply(reset)
    .forEach((item, i) =>
      outline(item).forEach((point, j) => close(point, outline(items[i])[j]))
    )
})

test('invalid optional selector metadata is ignored when opening a collage', () => {
  const items = series()
  const annotation = generateAnnotation(
    items.map((item) => ({
      ...placedMap(item),
      _allmaps: {
        collage: {
          version: 1,
          selectionTransform: {
            id: 'invalid',
            values: { scaleX: 1e-30, scaleY: 1e-30, skewX: 0, skewY: 0 },
            rotation: 0,
            mapRotation: 0
          }
        }
      }
    }))
  )
  const loaded = openCollage(annotation)
  assert.ok(loaded.every((item) => !item.selectionTransform))
  assert.doesNotThrow(() => createSelectionTransform(loaded))
  loaded.forEach((item, i) =>
    outline(item).forEach((point, j) => close(point, outline(items[i])[j]))
  )
})

function compareMaps(
  actual: ReturnType<typeof series>,
  expected: ReturnType<typeof series>
) {
  actual.forEach((item, i) =>
    outline(item).forEach((point, j) => close(point, outline(expected[i])[j]))
  )
}
function mixedSelection() {
  const items = series()
  setMapTransform(items[0], {
    scaleX: 1.4,
    scaleY: 0.6,
    skewX: 0.4,
    skewY: -0.6
  })
  setMapTransform(items[1], {
    scaleX: 0.8,
    scaleY: 1.7,
    skewX: -0.3,
    skewY: 0.2
  })
  mirrorMap(items[3])
  items.forEach((item, i) => {
    item.groupId = 'mixed'
    item.appearance.opacity = (i + 1) / 4
  })
  return items
}

test('Reset restores each mixed member, even without a shared selector deformation', () => {
  const items = mixedSelection()
  items[1].placement.rotation = 0.7
  const before = structuredClone(items)
  const expected = structuredClone(items)
  expected.forEach((item) => resetMapTransform(item))
  const result = resetSelectionTransform(items)
  compareMaps(result, expected)
  result.forEach((item, i) => {
    close(mapCenter(item), mapCenter(items[i]))
    assert.equal(item.placement.rotation, items[i].placement.rotation)
    assert.equal(item.mirrored, items[i].mirrored)
    assert.deepEqual(item.affine!.values, item.affine!.imported)
    assert.deepEqual(item.resourceMask, items[i].resourceMask)
    assert.deepEqual(item.appearance, items[i].appearance)
    assert.equal(item.groupId, items[i].groupId)
  })
  compareMaps(resetSelectionTransform(result), result)
  compareMaps(
    resetSelectionTransform(openCollage(exportCollage(result))),
    result
  )
  assert.deepEqual(items, before)
})

for (const alternate of [false, true]) {
  for (const orientation of [0, 0.4]) {
    test(`mixed Isometric replaces distortion and is stable across repeats/reopening (${alternate}, ${orientation})`, () => {
      const items = mixedSelection()
      const before = structuredClone(items)
      const result = makeSelectionIsometric(items, orientation, alternate)
      result.forEach((item, i) => {
        const [origin, px, py] = transformer(
          placedMap(item)
        ).transformToProjectedGeo([
          [0, 0],
          [100, 0],
          [0, 100]
        ] as Point[])
        const x: Point = [px[0] - origin[0], px[1] - origin[1]]
        const y: Point = [py[0] - origin[0], py[1] - origin[1]]
        close(
          [
            Math.hypot(...x) / Math.hypot(...y),
            area(outline(item)) / area(outline(items[i]))
          ],
          [1, 1]
        )
        const expectedAngle =
          orientation +
          ((alternate ? 1 : -1) * Math.PI) / 6 +
          (item.mirrored ? Math.PI : 0)
        close(x.map((v) => v / Math.hypot(...x)) as Point, [
          Math.cos(expectedAngle),
          Math.sin(expectedAngle)
        ])
        assert.equal(item.mirrored, items[i].mirrored)
        assert.deepEqual(item.appearance, items[i].appearance)
        assert.equal(item.groupId, items[i].groupId)
      })
      for (const input of [result, openCollage(exportCollage(result))]) {
        compareMaps(
          makeSelectionIsometric(input, orientation, alternate),
          result
        )
        compareMaps(
          makeSelectionIsometric(input, orientation, !alternate),
          makeSelectionIsometric(items, orientation, !alternate)
        )
        const reset = resetSelectionTransform(input)
        reset.forEach((item) =>
          assert.deepEqual(item.affine!.values, item.affine!.imported)
        )
        compareMaps(resetSelectionTransform(reset), reset)
      }
      assert.deepEqual(items, before)
    })
  }
}

test('selection presets preserve adjoining boundaries, restore spacing and retain later movement', () => {
  const items = series()
  const result = makeSelectionIsometric(items)
  const direct = createSelectionTransform(items)
  const frame = structuredClone(direct.frame)
  makeIsometric(frame)
  compareMaps(result, direct.apply(frame))
  const pivot = mapCenter(frame)
  const expected = structuredClone(items)
  for (const maps of [result, expected])
    maps.forEach((item) => {
      item.placement = rotatePlacement(item.placement, pivot, 0.7)
      item.placement.position[0] += 3000
      item.placement.position[1] -= 2000
    })
  compareMaps(resetSelectionTransform(result), expected)
})

test('mixed polynomial presets retain imported resets and expose a distinct neutral reset', () => {
  const source = mixedSelection()
  // Treat the fitted shapes as original polynomial imports, without Collage metadata.
  const maps = source.map((item) => {
    const map = placedMap(item)
    delete map._allmaps
    return map
  })
  const items = openCollage(generateAnnotation(maps))
  const tilted = makeSelectionIsometric(items)
  const restored = resetSelectionTransform(openCollage(exportCollage(tilted)))
  compareMaps(restored, items)
  const neutral = resetSelectionTransform(tilted, true)
  neutral.forEach((item, i) => {
    close(mapCenter(item), mapCenter(items[i]))
    assert.deepEqual(item.affine!.values, {
      scaleX: 1,
      scaleY: 1,
      skewX: 0,
      skewY: 0
    })
  })
  compareMaps(
    resetSelectionTransform(openCollage(exportCollage(neutral)), true),
    neutral
  )
  compareMaps(resetSelectionTransform(neutral), items)
})

test('replacing an existing tilt in a mixed selection preserves areas, crops and orientations on repeated presets', () => {
  const items = mixedSelection()
  makeIsometric(items[0], 0.3, true)
  items[1].placement.rotation = 1.9
  items[2].placement.rotation = -2.4
  setResourceMask(items[1], [
    [100, 50],
    [950, 200],
    [800, 900],
    [50, 600]
  ])
  const result = makeSelectionIsometric(items, 0.4)
  for (const input of [result, openCollage(exportCollage(result))]) {
    compareMaps(makeSelectionIsometric(input, 0.4), result)
    compareMaps(
      makeSelectionIsometric(input, 0.4, true),
      makeSelectionIsometric(items, 0.4, true)
    )
  }
  result.forEach((item, i) => {
    close([area(outline(item)) / area(outline(items[i])), 0], [1, 0])
    assert.deepEqual(item.resourceMask, items[i].resourceMask)
  })
})
