export type GeojsonPoint = {
  type: 'Point'
  coordinates: number[]
}

export type GeojsonLineString = {
  type: 'LineString'
  coordinates: number[][]
}

export type GeojsonPolygon = {
  type: 'Polygon'
  coordinates: number[][][]
}

export type GeojsonMultiPoint = {
  type: 'MultiPoint'
  coordinates: number[][]
}

export type GeojsonMultiLineString = {
  type: 'MultiLineString'
  coordinates: number[][][]
}

export type GeojsonMultiPolygon = {
  type: 'MultiPolygon'
  coordinates: number[][][][]
}

// Consider using @types/geojson!
export type GeojsonGeometry =
  | GeojsonPoint
  | GeojsonLineString
  | GeojsonPolygon
  | GeojsonMultiPoint
  | GeojsonMultiLineString
  | GeojsonMultiPolygon

export type GeojsonMultiGeometry =
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
