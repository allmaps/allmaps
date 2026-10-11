import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  ProjectedGcpTransformer,
  lonLatToWebMercator,
  webMercatorToLonLat
} from '@allmaps/project'
import type { GeoreferencedMap } from '@allmaps/annotation'
import type { Point } from '@allmaps/types'
import {
  cameraForCircle,
  circleFrame,
  circleFromCamera,
  constrainCircle,
  previewMap,
  circleChanged
} from '../src/lib/search-camera.ts'
import {
  cropMap,
  imageTransform,
  searchArea,
  resolvePlace
} from '../src/lib/map-search.ts'
import { coordinateFeature } from '../src/lib/search-geocoder.ts'

function source(latitude = 52, scale = 4): GeoreferencedMap {
  const center = lonLatToWebMercator([4, latitude])
  const angle = 0.6
  const points: Point[] = [
    [0, 0],
    [2000, 0],
    [0, 1200]
  ]
  return {
    type: 'GeoreferencedMap',
    resource: {
      id: 'https://example.org/iiif/test',
      type: 'ImageService2',
      width: 2000,
      height: 1200
    },
    resourceMask: [
      [0, 0],
      [2000, 0],
      [2000, 1200],
      [0, 1200]
    ],
    gcps: points.map(([x, y]) => ({
      resource: [x, y],
      geo: webMercatorToLonLat([
        center[0] +
          scale * ((x - 1000) * Math.cos(angle) + (y - 600) * Math.sin(angle)),
        center[1] +
          scale * ((x - 1000) * Math.sin(angle) - (y - 600) * Math.cos(angle))
      ])
    }))
  }
}

function placeAt(center: Point) {
  const feature = coordinateFeature('0, 0')!
  feature.geometry.coordinates = center
  return resolvePlace(feature, 'test')
}

function close(actual: number, expected: number, tolerance = 1e-6) {
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≈ ${expected}`)
}

test('fixed aperture round-trips the camera at different latitudes and viewport sizes', () => {
  for (const [width, height] of [
    [1280, 720],
    [390, 844],
    [844, 390]
  ]) {
    const frame = circleFrame(width, height)
    assert.ok(frame.x - frame.radius >= 0 && frame.x + frame.radius <= width)
    assert.ok(frame.y - frame.radius >= 0 && frame.y + frame.radius <= height)
    for (const latitude of [-60, 0, 52, 80]) {
      const circle = { center: [4, latitude] as Point, radius: 250 }
      const camera = cameraForCircle(circle, frame)
      const restored = circleFromCamera(camera.center, camera.zoom, frame)
      close(restored.center[0], circle.center[0])
      close(restored.center[1], circle.center[1])
      close(restored.radius, circle.radius)
      const zoomed = circleFromCamera(camera.center, camera.zoom + 1, frame)
      assert.ok(zoomed.radius < restored.radius)
      const panned = circleFromCamera(
        [camera.center[0] + 0.01, camera.center[1]],
        camera.zoom,
        frame
      )
      close(panned.center[0], restored.center[0] + 0.01)
      assert.deepEqual(frame, circleFrame(width, height))
    }
  }
})

test('camera constraints keep the entire crop inside rotated images, even at pan and zoom limits', () => {
  for (const latitude of [0, 52, 75]) {
    for (const scale of [4, 500]) {
      const map = source(latitude, scale)
      const transform = imageTransform(map)
      for (const center of [
        [-5000, -5000],
        [1000, 600],
        [6000, 8000]
      ] as Point[]) {
        for (const radius of [0.01, 250, 1e7]) {
          let bounded = constrainCircle(map, {
            center: transform.toGeo(center),
            radius
          })
          assert.ok(bounded.radius >= 10 && bounded.radius <= 50000)
          const place = placeAt(bounded.center)
          const crop = cropMap(map, searchArea(place, bounded.radius))
          assert.ok(
            crop,
            'clamped camera must produce a complete, exportable circle'
          )
          const before = structuredClone(bounded)
          for (let i = 0; i < 100; i++) bounded = constrainCircle(map, bounded)
          close(bounded.center[0], before.center[0])
          close(bounded.center[1], before.center[1])
          close(bounded.radius, before.radius, 0.001)
        }
      }
    }
  }
})

test('three-point preview agrees with the original fitted surface and crop after camera changes', () => {
  const original = source()
  original.gcps.push({
    resource: [2000, 1200],
    geo: imageTransform(source()).toGeo([2050, 1250])
  })
  const preview = previewMap(original)
  assert.equal(preview.gcps.length, 3)
  assert.deepEqual(preview.resourceMask, original.resourceMask)
  const fitted = new ProjectedGcpTransformer(original.gcps, 'helmert')
  const rendered = new ProjectedGcpTransformer(preview.gcps, 'helmert')
  const frame = circleFrame(1280, 720)
  const camera = cameraForCircle({ center: [4, 52], radius: 400 }, frame)
  const circle = constrainCircle(
    original,
    circleFromCamera(
      [camera.center[0] + 0.005, camera.center[1]],
      camera.zoom + 1,
      frame
    )
  )
  const place = placeAt(circle.center)
  const area = searchArea(place, circle.radius)
  const crop = cropMap(original, area)!
  crop.resourceMask.forEach((point, i) => {
    const a = fitted.transformToProjectedGeo(point)
    const b = rendered.transformToProjectedGeo(point)
    const expected = lonLatToWebMercator(area.geometry.coordinates[0][i])
    close(a[0], b[0], 1e-3)
    close(a[1], b[1], 1e-3)
    close(b[0], expected[0], 1e-3)
    close(b[1], expected[1], 1e-3)
  })
})

test('Refine ignores subpixel camera drift and becomes inactive again at the original view', () => {
  const frame = circleFrame(1280, 720)
  const query = { center: [4, 52] as Point, radius: 250 }
  assert.equal(circleChanged(query, query, frame), false)
  assert.equal(
    circleChanged({ center: [4 + 1e-9, 52], radius: 250.00001 }, query, frame),
    false
  )
  assert.equal(circleChanged({ ...query, radius: 300 }, query, frame), true)
  assert.equal(
    circleChanged({ ...query, center: [4.001, 52] }, query, frame),
    true
  )
  const camera = cameraForCircle(query, frame)
  assert.equal(
    circleChanged(
      circleFromCamera(camera.center, camera.zoom, frame),
      query,
      frame
    ),
    false
  )
})
