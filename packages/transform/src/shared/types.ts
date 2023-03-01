// TODO: consider moving these types and types from @allmaps/render
// to new package @allmaps/types

export type Position = [number, number]

export type BBox = [number, number, number, number]

export type GeoJSONPoint = {
  type: 'Point'
  coordinates: Position
}

export type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: Position[][]
}

export type ImageWorldGCP = { image: Position; world: Position }

export type Segment = {
  from: ImageWorldGCP
  to: ImageWorldGCP
}
