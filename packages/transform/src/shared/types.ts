import type { Position, GeojsonPoint } from '@allmaps/types'

/**
 * Ground Control Point (GCP).
 * A GCP contains a mapping between a sourcer and destination position.
 */
export type TransformGcp = { source: Position; destination: Position }

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
  // Assume destination positions are in lon/lat coordinates and use geographic distances and midpoints there
  destinationIsGeographic: boolean
  // Assume source positions are in lon/lat coordinates and use geographic distances and midpoints there
  sourceIsGeographic: boolean
}

export type PartialTransformOptions = Partial<TransformOptions>

export type KernelFunction = (r: number, epsilon?: number) => number
export type NormFunction = (position1: Position, position2: Position) => number

export type Transformation = {
  sourcePositions: Position[]
  destinationPositions: Position[]

  positionCount: number

  interpolate(position: Position): Position
}

export type GcpTransformerInterface = {
  gcps: TransformGcp[]

  transformForward(position: Position | GeojsonPoint): Position
  transformToGeo(position: Position | GeojsonPoint): Position

  transformBackward(position: Position | GeojsonPoint): Position
  transformToResource(position: Position | GeojsonPoint): Position
}
