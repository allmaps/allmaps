/* eslint-disable @typescript-eslint/no-explicit-any */
import { rewindGeometry } from '@placemarkio/geojson-rewind' // TODO: consider implementing these functions in this module instead of using dependencies

import type {
  Point,
  LineString,
  Line,
  Ring,
  Polygon,
  Geometry,
  GeojsonPoint,
  GeojsonLineString,
  GeojsonPolygon,
  GeojsonGeometry
} from '@allmaps/types'

// Assert

export function isPoint(input: any): input is Point {
  return (
    Array.isArray(input) &&
    input.length === 2 &&
    typeof input[0] === 'number' &&
    typeof input[1] === 'number'
  )
}

export function isLineString(input: any): input is LineString {
  return Array.isArray(input) && input.every(isPoint)
  // && !isClosed(input) // Possible addition if we want to check for closedness
}

// TODO: check if we keep Ring as unclosed.
// This function is not exported because Ring should not be used externally, since it can not be distingised from LineSting
function isRing(input: any): input is Ring {
  return (
    Array.isArray(input) && input.every(isPoint)
    // && isClosed(input) == closed // Possible addition if we want to check for closedness, with closed an input parameter with default false
  )
}

export function isPolygon(input: any): input is Polygon {
  return Array.isArray(input) && input.every(isRing)
}

export function isGeometry(input: any): input is Geometry {
  return isPoint(input) || isLineString(input) || isPolygon(input)
}

// Conform

export function conformLineString(lineString: LineString): LineString {
  // Filter out repeated points
  lineString = lineString.filter(function (point, i, originalLineString) {
    return i === 0 || !isEqualPoint(point, originalLineString[i - 1])
  })

  if (lineString.length < 2) {
    throw new Error('LineString should contain at least 2 points')
  }
  return lineString
}

export function conformRing(ring: Ring): Ring {
  // Filter out repeated points
  ring = ring.filter(function (point, i, originalRing) {
    return i === 0 || !isEqualPoint(point, originalRing[i - 1])
  })

  // Remove last point if input is closed ring
  if (isClosed(ring)) {
    ring.splice(-1)
  }

  if (ring.length < 3) {
    throw new Error('Ring should contain at least 3 points')
  }
  return ring
}

export function conformPolygon(polygon: Polygon): Polygon {
  return polygon.map((ring) => {
    return conformRing(ring)
  })
}

// Convert to GeoJSON

export function convertPointToGeojsonPoint(point: Point): GeojsonPoint {
  return {
    type: 'Point',
    coordinates: point
  }
}

export function convertLineStringToGeojsonLineString(
  lineString: LineString
): GeojsonLineString {
  return {
    type: 'LineString',
    coordinates: lineString
  }
}

export function convertRingToGeojsonPolygon(
  ring: Ring,
  close = true
): GeojsonPolygon {
  const geometry = {
    type: 'Polygon',
    coordinates: close ? [[...ring, ring[0]]] : [ring]
  }
  return rewindGeometry(geometry as GeojsonPolygon) as GeojsonPolygon
}

export function convertPolygonToGeojsonPolygon(
  polygon: Polygon,
  close = true
): GeojsonPolygon {
  const geometry = {
    type: 'Polygon',
    coordinates: close
      ? polygon.map((ring) => {
          return [...ring, ring[0]]
        })
      : polygon
  }

  return rewindGeometry(geometry as GeojsonPolygon) as GeojsonPolygon
}

export function convertGeometryToGeojsonGeometry(
  geometry: Geometry
): GeojsonGeometry {
  if (isPoint(geometry)) {
    return convertPointToGeojsonPoint(geometry)
  }
  if (isLineString(geometry)) {
    return convertLineStringToGeojsonLineString(geometry)
  }
  if (isPolygon(geometry)) {
    return convertPolygonToGeojsonPolygon(geometry)
  } else {
    throw new Error('Geometry type not supported')
  }
}

// Check

export function isClosed(input: Point[]): boolean {
  return (
    Array.isArray(input) &&
    input.length >= 2 &&
    isEqualPoint(input[0], input[input.length - 1])
  )
}

export function isEqualPoint(point1: Point, point: Point): boolean {
  if (point1 === point) return true
  if (point1 == null || point == null) return false

  return point1[0] == point[0] && point1[1] == point[1]
}

export function isEqualPointArray(
  pointArray1: Point[],
  pointArray2: Point[]
): boolean {
  if (pointArray1 === pointArray2) return true
  if (pointArray1 == null || pointArray2 == null) return false
  if (pointArray1.length !== pointArray2.length) return false

  for (let i = 0; i < pointArray1.length; ++i) {
    if (isEqualPoint(pointArray1[i], pointArray2[i])) return false
  }
  return true
}

export function isEqualPointArrayArray(
  pointArrayArray1: Point[][],
  pointArrayArray2: Point[][]
): boolean {
  if (pointArrayArray1 === pointArrayArray2) return true
  if (pointArrayArray1 == null || pointArrayArray2 == null) return false
  if (pointArrayArray1.length !== pointArrayArray2.length) return false

  for (let i = 0; i < pointArrayArray1.length; ++i) {
    if (isEqualPointArray(pointArrayArray1[i], pointArrayArray2[i]))
      return false
  }
  return true
}

// Compute

export function midPoint(point0: Point, point1: Point): Point {
  return [
    (point1[0] - point0[0]) / 2 + point0[0],
    (point1[1] - point0[1]) / 2 + point0[1]
  ]
}

export function mixPoints(point0: Point, point1: Point, t: number): Point {
  return [
    point0[0] * t + point1[0] * (1 - t),
    point0[1] * t + point1[1] * (1 - t)
  ]
}

export function distance(line: Line): number
export function distance(from: Point, to: Point): number
export function distance(from: Point | Line, to?: Point): number {
  if (isLineString(from) && from.length == 2) {
    return distance(from[0], from[1])
  } else if (isPoint(from) && isPoint(to)) {
    return Math.sqrt((to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2)
  } else {
    throw new Error('Input type not supported')
  }
}

export function degreesToRadians(degrees: number) {
  return degrees * (Math.PI / 180)
}
