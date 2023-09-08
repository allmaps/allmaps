// TODO: consider moving these types and types from @allmaps/render
// to new package @allmaps/types

export type TransformationType =
  | 'helmert'
  | 'polynomial'
  | 'polynomial1'
  | 'polynomial2'
  | 'polynomial3'
  | 'projective'
  | 'thinPlateSpline'

export type Position = [number, number]

export type BBox = [number, number, number, number]

// Consider using @types/geojson!
export type GeoJSONGeometry = GeoJSONPoint | GeoJSONLineString | GeoJSONPolygon

// The (string) values of the 'type' field of the type GeoJSONGeometry
export type GeoJSONGeometryType = GeoJSONGeometry['type']

export type GeoJSONPoint = {
  type: 'Point'
  coordinates: Position
}

export type GeoJSONLineString = {
  type: 'LineString'
  coordinates: Position[]
}

export type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: Position[][]
}

export type GCP = { resource: Position; geo: Position }

export type Segment = {
  from: GCP
  to: GCP
}

export type TransformOptions = {
  maxOffsetRatio: number
  maxDepth: number
  geographic: boolean // Assume this is a resource to geo setting with lonlat geo coordinates and use geographic distances and midpoints
}

export type OptionalTransformOptions = Partial<TransformOptions>

export type KernelFunction = (r: number, epsilon?: number) => number
export type NormFunction = (point1: Position, point2: Position) => number

export type GCPTransformerInterface = {
  gcps: GCP[]

  toGeo(point: Position): Position

  toResource(point: Position): Position
}
