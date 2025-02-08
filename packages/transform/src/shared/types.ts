import type { ConversionOptions, Gcp, Point } from '@allmaps/types'

/**
 * General Ground Control Point (GCP).
 * A GeneralGCP contains a mapping between a source and destination point.
 */
export type GeneralGcp = {
  source: Point
  destination: Point
}

export type Distortions = {
  partialDerivativeX: Point
  partialDerivativeY: Point
  distortions: Map<DistortionMeasure, number>
  distortion: number
}

export type GeneralGcpAndDistortions = GeneralGcp & Partial<Distortions>
export type GcpAndDistortions = Gcp & Partial<Distortions>

export type RefinementOptions = {
  minOffsetRatio: number
  minOffsetDistance: number
  minLineDistance: number
  maxDepth: number
  sourceMidPointFunction: (p0: Point, p1: Point) => Point
  destinationMidPointFunction: (p0: Point, p1: Point) => Point
  destinationDistanceFunction: (p0: Point, p1: Point) => number
}

export type SplitGcpLinePointInfo = SplitGcpLineInfo & {
  sourceMidPoint: Point
  destinationMidPointFromRefinementFunction: Point
}

export type SplitGcpLineInfo = {
  destinationMidPointsDistance: number
  destinationLineDistance: number
  destinationRefinedLineDistance: number
}

/** Transformation type. */
export type TransformationType =
  | 'straight'
  | 'helmert'
  | 'polynomial'
  | 'polynomial1'
  | 'polynomial2'
  | 'polynomial3'
  | 'projective'
  | 'thinPlateSpline'

// Stored here as object to facilitate parsing in CLI
export type TransformerInputs = {
  gcps: Gcp[]
  transformationType: TransformationType
}

// Stored here as object to facilitate parsing in CLI
export type InverseOptions = {
  inverse: boolean
}

export type TransformOptions = {
  maxDepth: number
  minOffsetRatio: number
  minOffsetDistance: number
  minLineDistance: number
  // Assume source points are in lon/lat coordinates and use geographic distances and midpoints there
  sourceIsGeographic: boolean
  // Assume destination points are in lon/lat coordinates and use geographic distances and midpoints there
  destinationIsGeographic: boolean
  // Whether one of the axes should be flipped while computing the transformation parameters.
  differentHandedness: boolean
  distortionMeasures: DistortionMeasure[]
  referenceScale: number
} & ConversionOptions

export type KernelFunction = (
  r: number,
  options: KernelFunctionOptions
) => number
export type KernelFunctionOptions = { derivative?: number; epsilon?: number }
export type NormFunction = (point0: Point, point1: Point) => number

export type DistortionMeasure =
  | 'log2sigma'
  | 'twoOmega'
  | 'airyKavr'
  | 'signDetJ'
  | 'thetaa'
