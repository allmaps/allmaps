export type Position = [number, number]

// export type BBox = [number, number, number, number] | [number, number, number, number, number, number];
export type BBox = [number, number, number, number]

export type GeoJSONPolygon = {
  type: 'Polygon'
  coordinates: Position[][]
}

// TODO: rename?
export type SVGPolygon = Position[]

export type Line = [Position, Position]

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
