export type Position = [number, number]

export type Line = [Position, Position]

export type LineString = Position[]

// Note:
// - Ring must be unclosed: last element is not a repition of the first
// - No requirement on winding order
// - No duplicate positions
// - At least three positions
export type Ring = Position[]

// Todo: define all types, see transform/shared/types
export type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: Position[][]
}

// TODO: replace by Ring and/or Polygon
export type SVGPolygon = Position[]

// export type BBox = [number, number, number, number] | [number, number, number, number, number, number];
export type BBox = [number, number, number, number]

export type Size = [number, number]

export type Extent = [number, number]

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
