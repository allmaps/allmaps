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
  // Note: Assuming there's only an outer ring for now
  const outerRing = geometry.coordinates[0]
  if (
    outerRing[0][0] === outerRing[outerRing.length - 1][0] &&
    outerRing[0][1] === outerRing[outerRing.length - 1][1]
  ) {
    outerRing.splice(-1)
  }
  return close ? [...outerRing, outerRing[0]] : outerRing
}
