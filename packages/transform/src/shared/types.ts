import type { MultiGeometryOptions, Gcp, Point } from '@allmaps/types'

/**
 * General Ground Control Point (GCP).
 * A GeneralGCP contains a mapping between a source and destination point.
 */
export type GeneralGcp = {
  source: Point
  destination: Point
}

export type DistortionMeasure =
  | 'log2sigma'
  | 'twoOmega'
  | 'airyKavr'
  | 'signDetJ'
  | 'thetaa'

export type Distortions = {
  partialDerivativeX: Point
  partialDerivativeY: Point
  distortions: Map<DistortionMeasure, number>
  distortion: number
}

export type GeneralGcpAndDistortions = GeneralGcp & Partial<Distortions>
export type GcpAndDistortions = Gcp & Partial<Distortions>

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
  | 'linear'

// Stored here as object to facilitate parsing in CLI and elsewhere
export type GcpsInputs = {
  gcps: Gcp[]
}
export type TransformationTypeInputs = {
  transformationType: TransformationType
}
export type GcpTransformerInputs = GcpsInputs & TransformationTypeInputs

export type HelmertMeasures = {
  translation: Point
  rotation: number
  scale: number
}
export type Polynomial1Measures = {
  translation: Point
  rotation: number
  scales: Point
  shears: Point
}
export type TransformationTypeMeasures =
  | HelmertMeasures
  | Polynomial1Measures
  | object

// Stored here as object to facilitate parsing in CLI
export type InverseOptions = {
  inverse: boolean
}

export type RefinementOptions = {
  maxDepth: number
  minOffsetRatio: number
  minOffsetDistance: number
  minLineDistance: number
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

export type GeneralGcpTransformOptions = {
  maxDepth: number
  minOffsetRatio: number
  minOffsetDistance: number
  minLineDistance: number
  sourceIsGeographic: boolean
  destinationIsGeographic: boolean
  distortionMeasures: DistortionMeasure[]
  referenceScale: number
  preForward: ProjectionFunction
  postForward: ProjectionFunction
  preBackward: ProjectionFunction
  postBackward: ProjectionFunction
} & MultiGeometryOptions

export type GcpTransformOptions = {
  maxDepth: number
  minOffsetRatio: number
  minOffsetDistance: number
  minLineDistance: number
  geoIsGeographic: boolean
  distortionMeasures: DistortionMeasure[]
  referenceScale: number
  postToGeo: ProjectionFunction
  preToResource: ProjectionFunction
} & MultiGeometryOptions

export type GeneralGcpTransformerOptions = {
  differentHandedness: boolean
} & GeneralGcpTransformOptions

export type GcpTransformerOptions = {
  differentHandedness: boolean
} & GcpTransformOptions

export type KernelFunction = (
  r: number,
  options: KernelFunctionOptions
) => number
export type KernelFunctionOptions = { derivative?: number; epsilon?: number }
export type NormFunction = (point0: Point, point1: Point) => number

export type ProjectionFunction = (point: Point) => Point
