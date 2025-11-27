import inside from 'point-in-polygon-hao'

import {
  distance,
  stepDistanceAngle,
  lineAngle,
  closeRing,
  closePolygon
} from '@allmaps/stdlib'

import type {
  Bbox,
  Line,
  LineString,
  Ring,
  Polygon,
  Point
} from '@allmaps/types'

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

// Returns true if point is inside of polygon with holes
export function pointInPolygon(point: Point, polygon: Polygon): boolean {
  try {
    return inside(point, closePolygon(polygon)) === true
  } catch (error) {
    console.error('Error determining if point is inside polygon:', error)
    return false
  }
}
