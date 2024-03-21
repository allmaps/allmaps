export type Point = [number, number]

export type Line = [Point, Point]

/**
 * Triangle
 * As `[[x0, y0], [x1, y1], [x2, y2]]`
 *
 * Winding order of points is free.
 *
 * @export
 * @typedef {Trianle}
 */
export type Triangle = [Point, Point, Point]

/**
 * Unique Index Triangle
 * As `[index0, index1, index2]` with each index pointing to a unique point
 *
 * Winding order of points is free.
 *
 * @typedef {Object} UniquePointsIndexTriangle
 */
export type UniquePointsIndexTriangle = [number, number, number]

/**
 * Rectangle (or possibly quadrilateral). Winding order of points is free.
 *
 * @export
 * @typedef {Rectangle}
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
 * @typedef {Object} Ring
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

export type Gcp = { resource: Point; geo: Point }

/**
 * Bboxx. Defined as [xMin, yMin, xMax, yMax]
 *
 * @export
 * @typedef {Bbox}
 */
export type Bbox = [number, number, number, number]

/**
 * Two numbers indicating the size of a Bbox as [width, height] or [xSize, ySize].
 * Alternatively, two numbers indicating the minimum and maximum of, for example, an array of numbers
 *
 * @export
 * @typedef {Size}
 */
export type Size = [number, number]

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
