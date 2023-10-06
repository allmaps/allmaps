import type { Position } from './geometry'

export type GeojsonPoint = {
  type: 'Point'
  coordinates: Position
}

export type GeojsonLineString = {
  type: 'LineString'
  coordinates: Position[]
}

export type GeojsonPolygon = {
  type: 'Polygon'
  coordinates: Position[][]
}

// Consider using @types/geojson!
export type GeojsonGeometry = GeojsonPoint | GeojsonLineString | GeojsonPolygon

// The (string) values of the 'type' field of the type GeojsonGeometrys
export type GeojsonGeometryType = GeojsonGeometry['type']

export type GeojsonFeature = {
  type: 'Feature'
  properties: unknown
  geometry: GeojsonGeometry
}

export type GeojsonFeatureCollection = {
  type: 'FeatureCollection'
  features: unknown[]
}
