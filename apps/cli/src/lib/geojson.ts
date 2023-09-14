import type {
  GCPTransformer,
  PartialTransformOptions
} from '@allmaps/transform'

import type { GeoJSONGeometry } from '@allmaps/types'

import type { GeometryElement } from './svg.js'

export function transformSvgToGeoJson(
  transformer: GCPTransformer,
  geometry: GeometryElement,
  transformOptions?: PartialTransformOptions
) {
  if (geometry.type === 'circle') {
    return transformer.transformPositionForwardToGeoJSONPoint(
      geometry.coordinates
    )
  } else if (geometry.type === 'line') {
    return transformer.transformLineStringForwardToGeoJSONLineString(
      geometry.coordinates,
      transformOptions
    )
  } else if (geometry.type === 'polyline') {
    return transformer.transformLineStringForwardToGeoJSONLineString(
      geometry.coordinates,
      transformOptions
    )
  } else if (geometry.type === 'rect') {
    return transformer.transformRingForwardToGeoJSONPolygon(
      geometry.coordinates,
      transformOptions
    )
  } else if (geometry.type === 'polygon') {
    return transformer.transformRingForwardToGeoJSONPolygon(
      geometry.coordinates,
      transformOptions
    )
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
