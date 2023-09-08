import type { Position, GCP } from '@allmaps/types'

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

export type OptionalTransformOptions = Partial<TransformOptions>

export type KernelFunction = (r: number, epsilon?: number) => number
export type NormFunction = (position1: Position, position2: Position) => number

export type Transform = {
  sourcePositions: Position[]
  destinationPositions: Position[]

  nPositions: number

  interpolant(position: Position): Position
}

export type GCPTransformerInterface = {
  gcps: GCP[]

  transformForward(position: Position): Position
  toGeo(position: Position): Position

  transformBackward(position: Position): Position
  toResource(position: Position): Position
}
