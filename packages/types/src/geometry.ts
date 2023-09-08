export type Position = [number, number]

export type Line = [Position, Position]

export type LineString = Position[]

// Note:
// - Ring must be unclosed: last element is not a repition of the first
// - No requirement on winding order
// - No duplicate positions
// - At least three positions
export type Ring = Position[]

export type GCP = { resource: Position; geo: Position }

// TODO: replace by Ring and/or Polygon
export type SVGPolygon = Position[]

// export type BBox = [number, number, number, number] | [number, number, number, number, number, number];
export type BBox = [number, number, number, number]

export type Size = [number, number]

export type Extent = [number, number]

// TODO: change name to something like 'helmert transformation signature'
export type Transform = [number, number, number, number, number, number]

export type Matrix4 = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
]

// Consider using @types/geojson!
export type GeoJSONGeometry = GeoJSONPoint | GeoJSONLineString | GeoJSONPolygon

// The (string) values of the 'type' field of the type GeoJSONGeometry
export type GeoJSONGeometryType = GeoJSONGeometry['type']

export type GeoJSONPoint = {
  type: 'Point'
  coordinates: [number, number]
}

export type GeoJSONLineString = {
  type: 'LineString'
  coordinates: [number, number][]
}

export type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: [number, number][][]
}
