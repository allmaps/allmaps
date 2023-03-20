import {
  toGeoJSONPoint,
  toGeoJSONLineString,
  toGeoJSONPolygon
} from '@allmaps/transform'

import type {
  GeoJSONGeometry,
  GCPTransformInfo,
  OptionalTransformOptions
} from '@allmaps/transform'

import type { GeometryElement } from './svg.js'

export function transformSvgToGeoJson(
  transformer: GCPTransformInfo,
  geometry: GeometryElement,
  options?: OptionalTransformOptions
) {
  if (geometry.type === 'circle') {
    return toGeoJSONPoint(transformer, geometry.coordinates)
  } else if (geometry.type === 'line') {
    return toGeoJSONLineString(transformer, geometry.coordinates, options)
  } else if (geometry.type === 'polyline') {
    return toGeoJSONLineString(transformer, geometry.coordinates, options)
  } else if (geometry.type === 'rect') {
    return toGeoJSONPolygon(transformer, geometry.coordinates, options)
  } else if (geometry.type === 'polygon') {
    return toGeoJSONPolygon(transformer, geometry.coordinates, options)
  } else {
    throw new Error(`Unsupported SVG geometry`)
  }
}

export function createFeatureCollection(geometries: GeoJSONGeometry[]) {
  return {
    type: 'FeatureCollection',
    features: geometries.map((geometry) => ({
      type: 'Feature',
      properties: {},
      geometry
    }))
  }
}

export function isGeoJSONGeometry(obj: unknown): obj is GeoJSONGeometry {
  const isObject = typeof obj === 'object' && obj !== null
  const hasStringType =
    isObject && 'type' in obj && typeof obj.type === 'string'
  const isValidType =
    hasStringType &&
    (obj.type === 'Point' ||
      obj.type === 'LineString' ||
      obj.type === 'Polygon')
  const hasCoordinatesArray =
    isObject && 'coordinates' in obj && Array.isArray(obj.coordinates)

  return isValidType && hasCoordinatesArray
}
