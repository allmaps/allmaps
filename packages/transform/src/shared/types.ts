import type { Point, GeojsonPoint } from '@allmaps/types'

/**
 * Ground Control Point (GCP).
 * A GCP contains a mapping between a source and destination point.
 */
export type TransformGcp = { source: Point; destination: Point }

export type Segment = {
  from: TransformGcp
  to: TransformGcp
}

/** Transformation type. */
export type TransformationType =
  | 'helmert'
  | 'polynomial'
  | 'polynomial1'
  | 'polynomial2'
  | 'polynomial3'
  | 'projective'
  | 'thinPlateSpline'

export type TransformOptions = {
  maxOffsetRatio: number
  maxDepth: number
  // Assume destination points are in lon/lat coordinates and use geographic distances and midpoints there
  destinationIsGeographic: boolean
  // Assume source points are in lon/lat coordinates and use geographic distances and midpoints there
  sourceIsGeographic: boolean
}

export type PartialTransformOptions = Partial<TransformOptions>

export type KernelFunction = (r: number, epsilon?: number) => number
export type NormFunction = (point1: Point, point2: Point) => number

export type Transformation = {
  sourcePoints: Point[]
  destinationPoints: Point[]

  pointCount: number

  interpolate(point: Point): Point
}

export type GcpTransformerInterface = {
  gcps: TransformGcp[]

  transformForward(point: Point | GeojsonPoint): Point
  transformToGeo(point: Point | GeojsonPoint): Point

  transformBackward(point: Point | GeojsonPoint): Point
  transformToResource(point: Point | GeojsonPoint): Point
}
