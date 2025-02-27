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
  conformMultiPolygon
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
  SvgGeometry
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

// Expand

export function expandGeojsonMultiPointToGeojsonPointArray(
  geojsonMultiPoint: GeojsonMultiPoint
): GeojsonPoint[] {
  return geojsonMultiPoint.coordinates.map((point) => {
    return {
      type: 'Point',
      coordinates: point
    }
  })
}

export function expandGeojsonMultiLineStringToGeojsonLineStringArray(
  geojsonMultiLineString: GeojsonMultiLineString
): GeojsonLineString[] {
  return geojsonMultiLineString.coordinates.map((lineString) => {
    return {
      type: 'LineString',
      coordinates: lineString
    }
  })
}

export function expandGeojsonMultiPolygonToGeojsonPolygonArray(
  geojsonMultiPolygon: GeojsonMultiPolygon
): GeojsonPolygon[] {
  return geojsonMultiPolygon.coordinates.map((polygon) => {
    return {
      type: 'Polygon',
      coordinates: polygon
    }
  })
}

export function expandGeojsonMultiGeometryToGeojsonGeometryArray(
  geojsonMultiGeometry:
    | GeojsonMultiPoint
    | GeojsonMultiLineString
    | GeojsonMultiPolygon
): GeojsonPoint[] | GeojsonLineString[] | GeojsonPolygon[] {
  if (isGeojsonMultiPoint(geojsonMultiGeometry)) {
    return expandGeojsonMultiPointToGeojsonPointArray(geojsonMultiGeometry)
  } else if (isGeojsonMultiLineString(geojsonMultiGeometry)) {
    return expandGeojsonMultiLineStringToGeojsonLineStringArray(
      geojsonMultiGeometry
    )
  } else if (isGeojsonMultiPolygon(geojsonMultiGeometry)) {
    return expandGeojsonMultiPolygonToGeojsonPolygonArray(geojsonMultiGeometry)
  } else {
    throw new Error('Geometry type not supported')
  }
}

// Join

export function joinGeojsonPointArrayToGeojsonMultiPoint(
  geojsonPointArray: GeojsonPoint[]
): GeojsonMultiPoint {
  return {
    type: 'MultiPoint',
    coordinates: geojsonPointArray.map(
      (geojsonPoint) => geojsonPoint.coordinates
    )
  }
}

export function joinGeojsonLineStringArrayToGeojsonMultiLineString(
  geojsonLineStringArray: GeojsonLineString[]
): GeojsonMultiLineString {
  return {
    type: 'MultiLineString',
    coordinates: geojsonLineStringArray.map(
      (geojsonLineString) => geojsonLineString.coordinates
    )
  }
}

export function joinGeojsonPolygonArrayToGeojsonMultiPolygon(
  geojsonPolygonArray: GeojsonPolygon[]
): GeojsonMultiPolygon {
  return {
    type: 'MultiPolygon',
    coordinates: geojsonPolygonArray.map(
      (geojsonPolygon) => geojsonPolygon.coordinates
    )
  }
}

export function joinGeojsonGeometryArrayToGeojsonMultiGeometry(
  geojsonGeometryArray: (GeojsonPoint | GeojsonLineString | GeojsonPolygon)[]
): GeojsonMultiPoint | GeojsonMultiLineString | GeojsonMultiPolygon {
  if (geojsonGeometryArray.every(isGeojsonPoint)) {
    return joinGeojsonPointArrayToGeojsonMultiPoint(geojsonGeometryArray)
  } else if (geojsonGeometryArray.every(isGeojsonLineString)) {
    return joinGeojsonLineStringArrayToGeojsonMultiLineString(
      geojsonGeometryArray
    )
  } else if (geojsonGeometryArray.every(isGeojsonPolygon)) {
    return joinGeojsonPolygonArrayToGeojsonMultiPolygon(geojsonGeometryArray)
  } else {
    throw new Error('Geometry type not supported')
  }
}

// Convert to SVG

export function geojsonToSvg(geometry: GeojsonGeometry): SvgGeometry {
  if (geometry.type === 'Point') {
    return {
      type: 'circle',
      coordinates: geometry.coordinates
    }
  } else if (geometry.type === 'LineString') {
    return {
      type: 'polyline',
      coordinates: geometry.coordinates
    }
  } else if (geometry.type === 'Polygon') {
    return {
      type: 'polygon',
      coordinates: geometry.coordinates[0]
    }
  } else {
    throw new Error(`Unsupported GeoJSON geometry`) // MultiPolygons not supported in SVG
  }
}

// Wrap

export function geometryToFeature(
  geometry: GeojsonGeometry,
  properties?: unknown
): GeojsonFeature {
  return {
    type: 'Feature',
    properties: properties ? properties : {},
    geometry: geometry
  }
}

export function featuresToFeatureCollection(
  features: GeojsonFeature | GeojsonFeature[]
): GeojsonFeatureCollection {
  if (!Array.isArray(features)) {
    features = [features]
  }
  return {
    type: 'FeatureCollection',
    features: features
  }
}

export function geometriesToFeatureCollection(
  geometries: GeojsonGeometry[],
  properties?: unknown[]
): GeojsonFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: geometries.map((geometry, i) =>
      properties
        ? geometryToFeature(geometry, properties[i])
        : geometryToFeature(geometry)
    )
  }
}

export function featureToGeometry(feature: GeojsonFeature): GeojsonGeometry {
  return feature.geometry
}

export function featureCollectionToGeometries(
  featureCollection: GeojsonFeatureCollection
): GeojsonGeometry[] {
  return featureCollection.features.map(featureToGeometry)
}
