import type { Position, GeojsonPoint } from '@allmaps/types'

/** Ground Controle Point (GCP) (as used in the Transform package). */
export type TransformGcp = { source: Position; destination: Position }

export type Segment = {
  from: TransformGcp
  to: TransformGcp
}

/** Transformation Type. */
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
  destinationIsGeographic: boolean // Assume destination positions are in lonlat coordinates and use geographic distances and midpoints there
  sourceIsGeographic: boolean // Assume source positions are in lonlat coordinates and use geographic distances and midpoints there
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
