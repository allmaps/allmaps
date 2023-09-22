/* eslint-disable @typescript-eslint/no-explicit-any */
import { rewindGeometry } from '@placemarkio/geojson-rewind' // TODO: consider implementing these functions in this module instead of using dependencies

import type {
  Position,
  LineString,
  Ring,
  Polygon,
  GeojsonPoint,
  GeojsonLineString,
  GeojsonPolygon
} from '@allmaps/types'

// Assert

export function isPosition(input: any): input is Position {
  return (
    Array.isArray(input) &&
    input.length === 2 &&
    typeof input[0] === 'number' &&
    typeof input[1] === 'number'
  )
}

export function isLineString(input: any): input is LineString {
  return Array.isArray(input) && input.every(isPosition)
  // && !isClosed(input) // Possible addition if we want to check for closedness
}

// TODO: check if we keep Ring as unclosed.
// This function is not exported because Ring should not be used externally, since it can not be distingised from LineSting
function isRing(input: any): input is Ring {
  return (
    Array.isArray(input) && input.every(isPosition)
    // && isClosed(input) == closed // Possible addition if we want to check for closedness, with closed an input parameter with default false
  )
}

export function isPolygon(input: any): input is Polygon {
  return Array.isArray(input) && input.every(isRing)
}

// Conform

export function conformLineString(lineString: LineString): LineString {
  // Filter out repeated positions
  lineString = lineString.filter(function (position, i, originalLineString) {
    return i === 0 || !isEqualPosition(position, originalLineString[i - 1])
  })

  if (lineString.length < 2) {
    throw new Error('LineString should contain at least 2 positions')
  }
  return lineString
}

export function conformRing(ring: Ring): Ring {
  // Filter out repeated positions
  ring = ring.filter(function (position, i, originalRing) {
    return i === 0 || !isEqualPosition(position, originalRing[i - 1])
  })

  // Remove last position if input is closed ring
  if (isClosed(ring)) {
    ring.splice(-1)
  }

  if (ring.length < 3) {
    throw new Error('Ring should contain at least 3 positions')
  }
  return ring
}

export function conformPolygon(polygon: Polygon): Polygon {
  return polygon.map((ring) => {
    return conformRing(ring)
  })
}

// Convert to GeoJSON

export function convertPositionToGeojsonPoint(
  position: Position
): GeojsonPoint {
  return {
    type: 'Point',
    coordinates: position
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

// Check

export function isClosed(input: Position[]): boolean {
  return (
    Array.isArray(input) &&
    input.length >= 2 &&
    isEqualPosition(input[0], input[input.length - 1])
  )
}

export function isEqualPosition(
  position1: Position,
  position2: Position
): boolean {
  if (position1 === position2) return true
  if (position1 == null || position2 == null) return false

  return position1[0] == position2[0] && position1[1] == position2[1]
}

export function isEqualPositionArray(
  positionArray1: Position[],
  positionArray2: Position[]
): boolean {
  if (positionArray1 === positionArray2) return true
  if (positionArray1 == null || positionArray2 == null) return false
  if (positionArray1.length !== positionArray2.length) return false

  for (let i = 0; i < positionArray1.length; ++i) {
    if (isEqualPosition(positionArray1[i], positionArray2[i])) return false
  }
  return true
}

export function isEqualPositionArrayArray(
  positionArrayArray1: Position[][],
  positionArrayArray2: Position[][]
): boolean {
  if (positionArrayArray1 === positionArrayArray2) return true
  if (positionArrayArray1 == null || positionArrayArray2 == null) return false
  if (positionArrayArray1.length !== positionArrayArray2.length) return false

  for (let i = 0; i < positionArrayArray1.length; ++i) {
    if (isEqualPositionArray(positionArrayArray1[i], positionArrayArray2[i]))
      return false
  }
  return true
}

// Compute

export function getMidPosition(
  position1: Position,
  position2: Position
): Position {
  return [
    (position2[0] - position1[0]) / 2 + position1[0],
    (position2[1] - position1[1]) / 2 + position1[1]
  ]
}

export function getDistance(from: Position, to: Position): number {
  return Math.sqrt((to[0] - from[0]) ** 2 + (to[1] - from[1]) ** 2)
}
