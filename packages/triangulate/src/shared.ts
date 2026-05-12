import { orient2d } from 'robust-predicates'

import {
  distance,
  stepDistanceAngle,
  lineAngle,
  closeRing,
  computeBbox
} from '@allmaps/stdlib'

import type {
  Bbox,
  Line,
  LineString,
  Ring,
  Polygon,
  Point
} from '@allmaps/types'

import type { PolygonForInsidenessCheck } from './types'

// Return an array of points containing the first line point,
// and betwen the first and last line point other points every `dist`
function interpolateLine(line: Line, dist: number): LineString {
  const lineDistance = distance(...line)
  // Note: ciel - 1 instead of floor, such that for round numbers we don't include the last step
  const steps = Math.ceil(lineDistance / dist) - 1
  const angle = lineAngle(line)

  let currentPoint = line[0]
  const result = [currentPoint]

  for (let step = 1; step <= steps; step++) {
    currentPoint = stepDistanceAngle(currentPoint, dist, angle)
    result.push(currentPoint)
  }

  // Note: the last nextpoint, which is also line[1], is not pushed
  return result
}

// Return an array of points containing the ring points,
// and between every pair of ring points other points every `dist`
export function interpolateRing(ring: Ring, dist: number): Ring {
  ring = closeRing(ring)

  let result: Ring = []
  for (let i = 0; i < ring.length - 1; i++) {
    result = result.concat(interpolateLine([ring[i], ring[i + 1]], dist))
  }

  return result
}

export function interpolatePolygon(polygon: Polygon, dist: number): Polygon {
  return polygon.map((ring) => interpolateRing(ring, dist))
}

export function getGridPointsInBbox(bbox: Bbox, gridSize: number): Point[] {
  const grid = []
  for (let x = bbox[0] + gridSize, i = 0; x <= bbox[2]; i++, x += gridSize) {
    for (let y = bbox[1] + gridSize, j = 0; y <= bbox[3]; j++, y += gridSize) {
      grid.push([x, y] as Point)
    }
  }
  return grid
}

export function preprocessPolygonForInsideCheck(
  polygon: Point[][]
): PolygonForInsidenessCheck {
  const closedRings = polygon.map((ring) => {
    const closedRing = closeRing(ring)
    const ringLength = closedRing.length - 1

    // Flat typed array: [x0, y0, x1, y1, ...] — avoids nested array pointer chasing
    const coords = new Float64Array(closedRing.length * 2)
    for (let i = 0; i < closedRing.length; i++) {
      coords[i * 2] = closedRing[i][0]
      coords[i * 2 + 1] = closedRing[i][1]
    }

    return { coords, length: ringLength }
  })

  const bbox = computeBbox(polygon)

  return { closedRings, bbox }
}

// Improved from point-in-polygon-hao package
// https://github.com/rowanwins/point-in-polygon-hao/blob/938b2be31d326c52c8f6cffbbb1c59bae4d609bc/src/index.js
// Returns true if point is inside of polygon with holes
//
// Speedups:
// - Reuse preprocessed polygon
// - Avoid point allocation (and it's garbage collection) and use coordinates
export function coordsInPolygonForInsidenessCheck(
  x: number,
  y: number,
  polygonForInsidenessCheck: PolygonForInsidenessCheck
) {
  if (
    x < polygonForInsidenessCheck.bbox[0] ||
    y < polygonForInsidenessCheck.bbox[1] ||
    x > polygonForInsidenessCheck.bbox[2] ||
    y > polygonForInsidenessCheck.bbox[3]
  )
    return false

  let k = 0
  const closedRings = polygonForInsidenessCheck.closedRings

  for (let i = 0; i < closedRings.length; i++) {
    const coords = closedRings[i].coords
    const length = closedRings[i].length

    let u1 = coords[0] - x
    let v1 = coords[1] - y

    for (let ii = 0; ii < length; ii++) {
      const base = (ii + 1) * 2
      const u2 = coords[base] - x
      const v2 = coords[base + 1] - y

      if (v1 === 0 && v2 === 0) {
        if ((u2 <= 0 && u1 >= 0) || (u1 <= 0 && u2 >= 0)) return 0
      } else if ((v2 >= 0 && v1 <= 0) || (v2 <= 0 && v1 >= 0)) {
        const f = orient2d(u1, u2, v1, v2, 0, 0)
        if (f === 0) return 0
        if ((f > 0 && v2 > 0 && v1 <= 0) || (f < 0 && v2 <= 0 && v1 > 0)) k++
      }

      u1 = u2
      v1 = v2
    }
  }

  return k % 2 !== 0
}

export function coordsInPolygonsForInsidenessCheck(
  x: number,
  y: number,
  polygonsForInsidenessChecks: PolygonForInsidenessCheck[]
) {
  return polygonsForInsidenessChecks.some((polygonForInsidenessChecks) =>
    coordsInPolygonForInsidenessCheck(x, y, polygonForInsidenessChecks)
  )
}
