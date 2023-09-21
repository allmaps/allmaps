/* eslint-disable @typescript-eslint/no-explicit-any */
import { rewindGeometry } from '@placemarkio/geojson-rewind' // TODO: consider implementing these functions in this module instead of using dependencies

import type {
  Position,
  LineString,
  Ring,
  Polygon,
  GeoJSONPoint,
  GeoJSONLineString,
  GeoJSONPolygon
} from '@allmaps/types'
import { isEqualPosition } from './geometry.js'

export function isClosed(input: Position[]): boolean {
  return (
    Array.isArray(input) &&
    input.length >= 2 &&
    isEqualPosition(input[0], input[input.length - 1])
  )
}

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

export function isGeoJSONPoint(input: any): input is GeoJSONPoint {
  return (
    typeof input === 'object' &&
    input !== null &&
    input.type === 'Point' &&
    isPosition(input.coordinates)
  )
}

export function isGeoJSONLineString(input: any): input is GeoJSONLineString {
  return (
    typeof input === 'object' &&
    input !== null &&
    input.type === 'LineString' &&
    isLineString(input.coordinates)
  )
}

export function isGeoJSONPolygon(input: any): input is GeoJSONPolygon {
  return (
    typeof input === 'object' &&
    input !== null &&
    input.type === 'Polygon' &&
    Array.isArray(input.coordinates) &&
    isPolygon(input.coordinates)
  )
}

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

export function convertPositionToGeoJSONPoint(
  position: Position
): GeoJSONPoint {
  return {
    type: 'Point',
    coordinates: position
  }
}

export function convertLineStringToGeoJSONLineString(
  lineString: LineString
): GeoJSONLineString {
  return {
    type: 'LineString',
    coordinates: lineString
  }
}

export function convertRingToGeoJSONPolygon(
  ring: Ring,
  close = true
): GeoJSONPolygon {
  const geometry = {
    type: 'Polygon',
    coordinates: close ? [[...ring, ring[0]]] : [ring]
  }

  return rewindGeometry(geometry as GeoJSONPolygon) as GeoJSONPolygon
}

export function convertPolygonToGeoJSONPolygon(
  polygon: Polygon,
  close = true
): GeoJSONPolygon {
  const geometry = {
    type: 'Polygon',
    coordinates: close
      ? polygon.map((ring) => {
          return [...ring, ring[0]]
        })
      : polygon
  }

  return rewindGeometry(geometry as GeoJSONPolygon) as GeoJSONPolygon
}

export function convertGeoJSONPointToPosition(
  geometry: GeoJSONPoint
): Position {
  return geometry.coordinates
}

export function convertGeoJSONLineStringToLineString(
  geometry: GeoJSONLineString
): LineString {
  return geometry.coordinates
}

export function convertGeoJSONPolygonToRing(
  geometry: GeoJSONPolygon,
  close = false
): Ring {
  let outerRing = geometry.coordinates[0]
  outerRing = conformRing(outerRing)
  return close ? [...outerRing, outerRing[0]] : outerRing
}

export function convertGeoJSONPolygonToPolygon(
  geometry: GeoJSONPolygon,
  close = false
): Polygon {
  let polygon = geometry.coordinates
  polygon = conformPolygon(polygon)
  return close ? polygon.map((ring) => [...ring, ring[0]]) : polygon
}
