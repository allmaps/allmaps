// TODO: consider moving these types and types from @allmaps/render
// to new package @allmaps/types

export type TransformationType = 'polynomial' | 'thin-plate-spline'

export type Position = [number, number]

export type BBox = [number, number, number, number]

// Consider using @types/geojson!
export type GeoJSONGeometry = GeoJSONPoint | GeoJSONLineString | GeoJSONPolygon

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

export type ImageWorldPosition = { image: Position; world: Position }

export type Segment = {
  from: ImageWorldPosition
  to: ImageWorldPosition
}

export type TransformOptions = {
  close: boolean
  maxOffsetRatio: number
  maxDepth: number
}

export type OptionalTransformOptions = Partial<TransformOptions>

export type DistanceFunction = (r: number, epsilon?: number) => number
export type NormFunction = (point1: Position, point2: Position) => number

export interface GCPTransformerInterface {
  gcps: ImageWorldPosition[]

  toWorld(point: Position): Position

  toResource(point: Position): Position

  // TODO: added to give WebGL2Render access to
  // GCPTransformInfo
  getOptions(): any
}
