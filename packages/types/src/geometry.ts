export type Position = [number, number]

export type Line = [Position, Position]

// Note:
// - At least 2 positions
// - No duplicate positions
export type LineString = Position[]

// Note:
// - At least 3 positions
// - No duplicate positions
// - Unclosed: last element is not a repetition of the first
// - So far no requirement on self-intersection although that may be useful in future
// - So far no requirement on winding order. This is only applied when exporting to geojson
export type Ring = Position[]

export type Polygon = Position[][]

export type Geometry = Position | LineString | Polygon

export type Gcp = { resource: Position; geo: Position }

// export type Bbox = [number, number, number, number] | [number, number, number, number, number, number];
export type Bbox = [number, number, number, number]

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
