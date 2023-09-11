// TODO: consider implementing these functions in this module instead of using dependencies
import { rewindGeometry } from '@placemarkio/geojson-rewind'

import type {
  Position,
  LineString,
  Ring,
  GeoJSONPoint,
  GeoJSONLineString,
  GeoJSONPolygon
} from '@allmaps/types'
import { isEqualPosition } from './geometry.js'

export function conformLineString(lineString: LineString): LineString {
  // Filter out repeated positions
  lineString = lineString.filter(function (position, i, originalLineString) {
    return i === 0 || position !== originalLineString[i - 1]
  })

  if (lineString.length < 2) {
    throw new Error('LineString should contain at least 2 positions')
  }
  return lineString
}

export function conformRing(ring: Ring): Ring {
  // Filter out repeated positions
  ring = ring.filter(function (position, i, originalRing) {
    return i === 0 || position !== originalRing[i - 1]
  })

  // Remove last position if input is closed ring
  if (isEqualPosition(ring[0], ring[ring.length - 1])) {
    ring.splice(-1)
  }

  if (ring.length < 3) {
    throw new Error('LineString should contain at least 3 positions')
  }
  return ring
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
