import type { Position } from '@allmaps/types'

/** Ground Controle Point (GCP) (as used in the Transform package). */
export type TransformGCP = { source: Position; destination: Position }

export type Segment = {
  from: TransformGCP
  to: TransformGCP
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
  geographic: boolean // Assume this is a resource to geo setting with lonlat geo coordinates and use geographic distances and midpoints
}

export type PartialTransformOptions = Partial<TransformOptions>

export type KernelFunction = (r: number, epsilon?: number) => number
export type NormFunction = (position1: Position, position2: Position) => number

export type Transformation = {
  sourcePositions: Position[]
  destinationPositions: Position[]

  nPositions: number

  interpolant(position: Position): Position
}

export type GCPTransformerInterface = {
  gcps: TransformGCP[]

  transformForward(position: Position): Position
  toGeo(position: Position): Position

  transformBackward(position: Position): Position
  toResource(position: Position): Position
}
