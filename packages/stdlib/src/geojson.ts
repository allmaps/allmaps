import {
  isPoint,
  isLineString,
  isPolygon,
  isMultiPoint,
  isMultiLineString,
  isMultiPolygon,
  conformLineString,
  conformRing,
  conformPolygon,
  conformMultiLineString,
  conformMultiPolygon,
  geometryToSvgGeometry
} from './geometry.js'

import type {
  Point,
  LineString,
  Ring,
  Polygon,
  MultiPoint,
  MultiLineString,
  MultiPolygon,
  Geometry,
  GeojsonPoint,
  GeojsonLineString,
  GeojsonPolygon,
  GeojsonMultiPoint,
  GeojsonMultiLineString,
  GeojsonMultiPolygon,
  GeojsonGeometry,
  GeojsonFeature,
  GeojsonFeatureCollection,
  SvgGeometry,
  GeojsonMultiGeometry
} from '@allmaps/types'

// Assert

export function isGeojsonPoint(input: unknown): input is GeojsonPoint {
  return (
    typeof input === 'object' &&
    input !== null &&
    'type' in input &&
    input.type === 'Point' &&
    'coordinates' in input &&
    isPoint(input.coordinates)
  )
}

export function isGeojsonLineString(
  input: unknown
): input is GeojsonLineString {
  return (
    typeof input === 'object' &&
    input !== null &&
    'type' in input &&
    input.type === 'LineString' &&
    'coordinates' in input &&
    isLineString(input.coordinates)
  )
}

export function isGeojsonPolygon(input: unknown): input is GeojsonPolygon {
  return (
    typeof input === 'object' &&
    input !== null &&
    'type' in input &&
    input.type === 'Polygon' &&
    'coordinates' in input &&
    Array.isArray(input.coordinates) &&
    isPolygon(input.coordinates)
  )
}

export function isGeojsonMultiPoint(
  input: unknown
): input is GeojsonMultiPoint {
  return (
    typeof input === 'object' &&
    input !== null &&
    'type' in input &&
    input.type === 'MultiPoint' &&
    'coordinates' in input &&
    isMultiPoint(input.coordinates)
  )
}

export function isGeojsonMultiLineString(
  input: unknown
): input is GeojsonMultiLineString {
  return (
    typeof input === 'object' &&
    input !== null &&
    'type' in input &&
    input.type === 'MultiLineString' &&
    'coordinates' in input &&
    isMultiLineString(input.coordinates)
  )
}

export function isGeojsonMultiPolygon(
  input: unknown
): input is GeojsonMultiPolygon {
  return (
    typeof input === 'object' &&
    input !== null &&
    'type' in input &&
    input.type === 'MultiPolygon' &&
    'coordinates' in input &&
    Array.isArray(input.coordinates) &&
    isMultiPolygon(input.coordinates)
  )
}

export function isGeojsonGeometry(obj: unknown): obj is GeojsonGeometry {
  const isObject = typeof obj === 'object' && obj !== null
  const hasStringType =
    isObject && 'type' in obj && typeof obj.type === 'string'
  const isValidType =
    hasStringType &&
    (obj.type === 'Point' ||
      obj.type === 'LineString' ||
      obj.type === 'Polygon' ||
      obj.type === 'MultiPoint' ||
      obj.type === 'MultiLineString' ||
      obj.type === 'MultiPolygon')
  const hasCoordinatesArray =
    isObject && 'coordinates' in obj && Array.isArray(obj.coordinates)

  return isValidType && hasCoordinatesArray
}

export function isGeojsonMultiGeometry(
  obj: unknown
): obj is GeojsonMultiGeometry {
  const isObject = typeof obj === 'object' && obj !== null
  const hasStringType =
    isObject && 'type' in obj && typeof obj.type === 'string'
  const isValidType =
    hasStringType &&
    (obj.type === 'MultiPoint' ||
      obj.type === 'MultiLineString' ||
      obj.type === 'MultiPolygon')
  const hasCoordinatesArray =
    isObject && 'coordinates' in obj && Array.isArray(obj.coordinates)

  return isValidType && hasCoordinatesArray
}

// Convert to Geometry

export function geojsonPointToPoint(geojsonPoint: GeojsonPoint): Point {
  return geojsonPoint.coordinates
}

export function geojsonLineStringToLineString(
  geojsonLineString: GeojsonLineString
): LineString {
  return conformLineString(geojsonLineString.coordinates)
}

export function geojsonPolygonToRing(
  geojsonPolygon: GeojsonPolygon,
  close = false
): Ring {
  let outerRing = geojsonPolygon.coordinates[0]
  outerRing = conformRing(outerRing)
  return close ? [...outerRing, outerRing[0]] : outerRing
}

export function geojsonPolygonToPolygon(
  geojsonPolygon: GeojsonPolygon,
  close = false
): Polygon {
  let polygon = geojsonPolygon.coordinates
  polygon = conformPolygon(polygon)
  return close ? polygon.map((ring) => [...ring, ring[0]]) : polygon
}

export function geojsonMultiPointToMultiPoint(
  geojsonMultiPoint: GeojsonMultiPoint
): MultiPoint {
  return geojsonMultiPoint.coordinates
}

export function geojsonMultiLineStringToMultiLineString(
  geojsonMultiLineString: GeojsonMultiLineString
): MultiLineString {
  return conformMultiLineString(geojsonMultiLineString.coordinates)
}

export function geojsonMultiPolygonToMultiPolygon(
  geojsonMultiPolygon: GeojsonMultiPolygon,
  close = false
): MultiPolygon {
  let multipolygon = geojsonMultiPolygon.coordinates
  multipolygon = conformMultiPolygon(multipolygon)
  return close
    ? multipolygon.map((polygon) => polygon.map((ring) => [...ring, ring[0]]))
    : multipolygon
}

export function geojsonGeometryToGeometry(geojsonPoint: GeojsonPoint): Point
export function geojsonGeometryToGeometry(
  geojsonLineString: GeojsonLineString
): LineString
export function geojsonGeometryToGeometry(
  geojsonPolygon: GeojsonPolygon
): Polygon
export function geojsonGeometryToGeometry(
  geojsonMultiPoint: GeojsonMultiPoint
): MultiPoint
export function geojsonGeometryToGeometry(
  geojsonMultiLineString: GeojsonMultiLineString
): MultiLineString
export function geojsonGeometryToGeometry(
  geojsonMultiPolygon: GeojsonMultiPolygon
): MultiPolygon
export function geojsonGeometryToGeometry(
  geojsonGeometry: GeojsonGeometry
): Geometry
/**
 * Converts a GeoJSON Geometry to a Geometry
 * @param geojsonGeometry - GeoJSON Geometry
 * @returns Geometry
 */
export function geojsonGeometryToGeometry(
  geojsonGeometry: GeojsonGeometry
): Geometry {
  if (isGeojsonPoint(geojsonGeometry)) {
    return geojsonPointToPoint(geojsonGeometry)
  } else if (isGeojsonLineString(geojsonGeometry)) {
    return geojsonLineStringToLineString(geojsonGeometry)
  } else if (isGeojsonPolygon(geojsonGeometry)) {
    return geojsonPolygonToPolygon(geojsonGeometry)
  } else if (isGeojsonMultiPoint(geojsonGeometry)) {
    return geojsonMultiPointToMultiPoint(geojsonGeometry)
  } else if (isGeojsonMultiLineString(geojsonGeometry)) {
    return geojsonMultiLineStringToMultiLineString(geojsonGeometry)
  } else if (isGeojsonMultiPolygon(geojsonGeometry)) {
    return geojsonMultiPolygonToMultiPolygon(geojsonGeometry)
  } else {
    throw new Error('Geometry type not supported')
  }
}

// Convert to SVG

export function geojsonGeometryToSvgGeometry(
  geojsonGeometry: GeojsonGeometry
): SvgGeometry {
  return geometryToSvgGeometry(geojsonGeometryToGeometry(geojsonGeometry))
}

// Wrap Geometry in Feature

export function geojsonGeometryToGeojsonFeature(
  geojsonGeometry: GeojsonGeometry,
  properties?: unknown
): GeojsonFeature {
  return {
    type: 'Feature',
    properties: properties ? properties : {},
    geometry: geojsonGeometry
  }
}

export function geojsonFeaturesToGeojsonFeatureCollection(
  geojsonFeatures: GeojsonFeature | GeojsonFeature[]
): GeojsonFeatureCollection {
  if (!Array.isArray(geojsonFeatures)) {
    geojsonFeatures = [geojsonFeatures]
  }
  return {
    type: 'FeatureCollection',
    features: geojsonFeatures
  }
}

export function geojsonGeometriesToGeojsonFeatureCollection(
  geojsonGeometries: GeojsonGeometry[],
  properties?: unknown[]
): GeojsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: geojsonGeometries.map((geometry, i) =>
      properties
        ? geojsonGeometryToGeojsonFeature(geometry, properties[i])
        : geojsonGeometryToGeojsonFeature(geometry)
    )
  }
}

export function geojsonFeatureToGeojsonGeometry(
  geojsonFeature: GeojsonFeature
): GeojsonGeometry {
  return geojsonFeature.geometry
}

export function geojsonFeatureCollectionToGeojsonGeometries(
  geojsonFeatureCollection: GeojsonFeatureCollection
): GeojsonGeometry[] {
  return geojsonFeatureCollection.features.map(geojsonFeatureToGeojsonGeometry)
}

// Expand

export function expandGeojsonMultiPointToGeojsonPoints(
  geojsonMultiPoint: GeojsonMultiPoint
): GeojsonPoint[] {
  return geojsonMultiPoint.coordinates.map((point) => {
    return {
      type: 'Point',
      coordinates: point
    }
  })
}

export function expandGeojsonMultiLineStringToGeojsonLineStrings(
  geojsonMultiLineString: GeojsonMultiLineString
): GeojsonLineString[] {
  return geojsonMultiLineString.coordinates.map((lineString) => {
    return {
      type: 'LineString',
      coordinates: lineString
    }
  })
}

export function expandGeojsonMultiPolygonToGeojsonPolygons(
  geojsonMultiPolygon: GeojsonMultiPolygon
): GeojsonPolygon[] {
  return geojsonMultiPolygon.coordinates.map((polygon) => {
    return {
      type: 'Polygon',
      coordinates: polygon
    }
  })
}

export function expandGeojsonMultiGeometryToGeojsonGeometries(
  geojsonMultiGeometry:
    | GeojsonMultiPoint
    | GeojsonMultiLineString
    | GeojsonMultiPolygon
): GeojsonPoint[] | GeojsonLineString[] | GeojsonPolygon[] {
  if (isGeojsonMultiPoint(geojsonMultiGeometry)) {
    return expandGeojsonMultiPointToGeojsonPoints(geojsonMultiGeometry)
  } else if (isGeojsonMultiLineString(geojsonMultiGeometry)) {
    return expandGeojsonMultiLineStringToGeojsonLineStrings(
      geojsonMultiGeometry
    )
  } else if (isGeojsonMultiPolygon(geojsonMultiGeometry)) {
    return expandGeojsonMultiPolygonToGeojsonPolygons(geojsonMultiGeometry)
  } else {
    throw new Error('Geometry type not supported')
  }
}

// Contract

export function contractGeojsonPointsToGeojsonMultiPoint(
  geojsonPoints: GeojsonPoint[]
): GeojsonMultiPoint {
  return {
    type: 'MultiPoint',
    coordinates: geojsonPoints.map((geojsonPoint) => geojsonPoint.coordinates)
  }
}

export function contractGeojsonLineStringsToGeojsonMultiLineString(
  geojsonLineStrings: GeojsonLineString[]
): GeojsonMultiLineString {
  return {
    type: 'MultiLineString',
    coordinates: geojsonLineStrings.map(
      (geojsonLineString) => geojsonLineString.coordinates
    )
  }
}

export function contractGeojsonPolygonsToGeojsonMultiPolygon(
  geojsonPolygons: GeojsonPolygon[]
): GeojsonMultiPolygon {
  return {
    type: 'MultiPolygon',
    coordinates: geojsonPolygons.map(
      (geojsonPolygon) => geojsonPolygon.coordinates
    )
  }
}

export function contractGeojsonGeometriesToGeojsonMultiGeometry(
  geojsonGeometries: (GeojsonPoint | GeojsonLineString | GeojsonPolygon)[]
): GeojsonMultiPoint | GeojsonMultiLineString | GeojsonMultiPolygon {
  if (geojsonGeometries.every(isGeojsonPoint)) {
    return contractGeojsonPointsToGeojsonMultiPoint(geojsonGeometries)
  } else if (geojsonGeometries.every(isGeojsonLineString)) {
    return contractGeojsonLineStringsToGeojsonMultiLineString(geojsonGeometries)
  } else if (geojsonGeometries.every(isGeojsonPolygon)) {
    return contractGeojsonPolygonsToGeojsonMultiPolygon(geojsonGeometries)
  } else {
    throw new Error('Geometry type not supported')
  }
}

export function mergeGeojsonFeaturesCollections(
  geojsonFeatureCollections: GeojsonFeatureCollection[]
): GeojsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: geojsonFeatureCollections
      .map((geojsonFeatureCollection) => geojsonFeatureCollection.features)
      .flat(1)
  }
}
