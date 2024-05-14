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

/* eslint-disable @typescript-eslint/no-explicit-any */
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

export function isGeojsonPoint(input: any): input is GeojsonPoint {
  return (
    typeof input === 'object' &&
    input !== null &&
    input.type === 'Point' &&
    isPoint(input.coordinates)
  )
}

export function isGeojsonLineString(input: any): input is GeojsonLineString {
  return (
    typeof input === 'object' &&
    input !== null &&
    input.type === 'LineString' &&
    isLineString(input.coordinates)
  )
}

export function isGeojsonPolygon(input: any): input is GeojsonPolygon {
  return (
    typeof input === 'object' &&
    input !== null &&
    input.type === 'Polygon' &&
    Array.isArray(input.coordinates) &&
    isPolygon(input.coordinates)
  )
}

export function isGeojsonMultiPoint(input: any): input is GeojsonMultiPoint {
  return (
    typeof input === 'object' &&
    input !== null &&
    input.type === 'MultiPoint' &&
    isMultiPoint(input.coordinates)
  )
}

export function isGeojsonMultiLineString(
  input: any
): input is GeojsonMultiLineString {
  return (
    typeof input === 'object' &&
    input !== null &&
    input.type === 'MultiLineString' &&
    isMultiLineString(input.coordinates)
  )
}

export function isGeojsonMultiPolygon(
  input: any
): input is GeojsonMultiPolygon {
  return (
    typeof input === 'object' &&
    input !== null &&
    input.type === 'MultiPolygon' &&
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

export function convertGeojsonPointToPoint(geojsonPoint: GeojsonPoint): Point {
  return geojsonPoint.coordinates
}

export function convertGeojsonLineStringToLineString(
  geojsonLineString: GeojsonLineString
): LineString {
  return conformLineString(geojsonLineString.coordinates)
}

export function convertGeojsonPolygonToRing(
  geojsonPolygon: GeojsonPolygon,
  close = false
): Ring {
  let outerRing = geojsonPolygon.coordinates[0]
  outerRing = conformRing(outerRing)
  return close ? [...outerRing, outerRing[0]] : outerRing
}

export function convertGeojsonPolygonToPolygon(
  geojsonPolygon: GeojsonPolygon,
  close = false
): Polygon {
  let polygon = geojsonPolygon.coordinates
  polygon = conformPolygon(polygon)
  return close ? polygon.map((ring) => [...ring, ring[0]]) : polygon
}

export function convertGeojsonMultiPointToMultiPoint(
  geojsonMultiPoint: GeojsonMultiPoint
): MultiPoint {
  return geojsonMultiPoint.coordinates
}

export function convertGeojsonMultiLineStringToMultiLineString(
  geojsonMultiLineString: GeojsonMultiLineString
): MultiLineString {
  return conformMultiLineString(geojsonMultiLineString.coordinates)
}

export function convertGeojsonMultiPolygonToMultiPolygon(
  geojsonMultiPolygon: GeojsonMultiPolygon,
  close = false
): MultiPolygon {
  let multipolygon = geojsonMultiPolygon.coordinates
  multipolygon = conformMultiPolygon(multipolygon)
  return close
    ? multipolygon.map((polygon) => polygon.map((ring) => [...ring, ring[0]]))
    : multipolygon
}

export function convertGeojsonGeometryToGeometry(
  geojsonGeometry: GeojsonGeometry
): Geometry {
  if (isGeojsonPoint(geojsonGeometry)) {
    return convertGeojsonPointToPoint(geojsonGeometry)
  } else if (isGeojsonLineString(geojsonGeometry)) {
    return convertGeojsonLineStringToLineString(geojsonGeometry)
  } else if (isGeojsonPolygon(geojsonGeometry)) {
    return convertGeojsonPolygonToPolygon(geojsonGeometry)
  } else if (isGeojsonMultiPoint(geojsonGeometry)) {
    return convertGeojsonMultiPointToMultiPoint(geojsonGeometry)
  } else if (isGeojsonMultiLineString(geojsonGeometry)) {
    return convertGeojsonMultiLineStringToMultiLineString(geojsonGeometry)
  } else if (isGeojsonMultiPolygon(geojsonGeometry)) {
    return convertGeojsonMultiPolygonToMultiPolygon(geojsonGeometry)
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

export function convertGeojsonToSvg(geometry: GeojsonGeometry): SvgGeometry {
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
