export type Point = [number, number]

export type Line = [Point, Point]

/**
 * Triangle
 * As `[[x0, y0], [x1, y1], [x2, y2]]`
 *
 * Winding order of points is free.
 */
export type Triangle = [Point, Point, Point]

/**
 * Rectangle (or possibly quadrilateral). Winding order of points is free.
 */
export type Rectangle = [Point, Point, Point, Point]

// Note:
// - At least 2 points
// - No duplicate points
export type LineString = Point[]

/**
 * Ring as `[[number, number], ...]`
 *
 * Must contain at least 3 points
 * May not contain duplicate points
 * Must be unclosed: last element is not a repetition of the first
 * May not be self-intersecting
 * So far no requirement on self-intersection although that may be useful in future
 * So far no requirement on winding order. This is only applied when exporting to GeoJSON
 */
export type Ring = Point[]

export type Polygon = Point[][]

export type MultiPoint = Point[]
export type MultiLineString = Point[][]
export type MultiPolygon = Point[][][]

export type Geometry =
  | Point
  | LineString
  | Polygon
  | MultiPoint
  | MultiLineString
  | MultiPolygon

export type TypedLine<P> = [P, P]
export type TypedTriangle<P> = [P, P, P]
export type TypedRectangle<P> = [P, P, P, P]
export type TypedLineString<P> = P[]
export type TypedRing<P> = P[]
export type TypedPolygon<P> = P[][]
export type TypedMultiPoint<P> = P[]
export type TypedMultiLineString<P> = P[][]
export type TypedMultiPolygon<P> = P[][][]

export type TypedGeometry<P> =
  | P
  | TypedLineString<P>
  | TypedPolygon<P>
  | TypedMultiPoint<P>
  | TypedMultiLineString<P>
  | TypedMultiPolygon<P>

export type ConversionOptions = {
  isMultiGeometry: false
}

export type Gcp = { resource: Point; geo: Point }

/**
 * Bbox. Defined as [xMin, yMin, xMax, yMax]
 */
export type Bbox = [number, number, number, number]

/**
 * Two numbers indicating the size of a Bbox as [width, height] or [xSize, ySize].
 * Alternatively, two numbers indicating the minimum and maximum of, for example, an array of numbers
 */
export type Size = [number, number]

/**
 * Two ways two rectangles (or shapes in general) can overlap:
 * - 'contain': The first contains the second
 * - 'cover': The first is covered by the second
 *
 * @export
 * @typedef {Fit}
 */
export type Fit = 'cover' | 'contain'

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
