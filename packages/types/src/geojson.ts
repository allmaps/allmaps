import type { Point } from './geometry'

export type GeojsonPoint = {
  type: 'Point'
  coordinates: Point
}

export type GeojsonLineString = {
  type: 'LineString'
  coordinates: Point[]
}

export type GeojsonPolygon = {
  type: 'Polygon'
  coordinates: Point[][]
}

export type GeojsonMultiPoint = {
  type: 'MultiPoint'
  coordinates: Point[]
}

export type GeojsonMultiLineString = {
  type: 'MultiLineString'
  coordinates: Point[][]
}

export type GeojsonMultiPolygon = {
  type: 'MultiPolygon'
  coordinates: Point[][][]
}

// Consider using @types/geojson!
export type GeojsonGeometry =
  | GeojsonPoint
  | GeojsonLineString
  | GeojsonPolygon
  | GeojsonMultiPoint
  | GeojsonMultiLineString
  | GeojsonMultiPolygon

// The (string) values of the 'type' field of the type GeojsonGeometrys
export type GeojsonGeometryType = GeojsonGeometry['type']

export type GeojsonFeature = {
  type: 'Feature'
  properties: unknown
  geometry: GeojsonGeometry
}

export type GeojsonFeatureCollection = {
  type: 'FeatureCollection'
  features: GeojsonFeature[]
}
