import type { Position, GeoJSONPoint } from '@allmaps/types'

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
  destinationIsGeographic: boolean // Assume destination positions are in lonlat coordinates and use geographic distances and midpoints there
  sourceIsGeographic: boolean // Assume source positions are in lonlat coordinates and use geographic distances and midpoints there
}

export type PartialTransformOptions = Partial<TransformOptions>

export type KernelFunction = (r: number, epsilon?: number) => number
export type NormFunction = (position1: Position, position2: Position) => number

export type Transformation = {
  sourcePositions: Position[]
  destinationPositions: Position[]

  nPositions: number

  interpolate(position: Position): Position
}

export type GCPTransformerInterface = {
  gcps: TransformGCP[]

  transformForward(position: Position | GeoJSONPoint): Position
  transformToGeo(position: Position | GeoJSONPoint): Position

  transformBackward(position: Position | GeoJSONPoint): Position
  transformToResource(position: Position | GeoJSONPoint): Position
}
