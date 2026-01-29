import { DistortionMeasure } from '@allmaps/transform'
import {
  HelmertMeasures,
  Polynomial1Measures
} from '@allmaps/transform/shared/types'
import { Point } from '@allmaps/types'

/**
 * Analysis options
 */
export type AnalysisOptions = {
  codes: string[]
  maxRmseDiameterFraction: number
  maxShear: number
  maxLog2sigma: number
  minLog2sigma: number
  maxTwoOmega: number
}

/**
 * Analysis item
 */
export type AnalysisItem = {
  mapId?: string
  code: string
  resourcePoint?: Point
  geoPoint?: Point
  projectedGeoPoint?: Point
  gcpIndex?: number
  maskPointIndex?: number
  message: string
  originalMessage?: string
  text?: string
}

/**
 * Analysis
 */
export type Analysis = {
  info: AnalysisItem[]
  warnings: AnalysisItem[]
  errors: AnalysisItem[]
}

/**
 * Measures
 */
export type Measures = {
  mapId?: string

  projectedGeoDiameter: number

  destinationRmse: number
  destinationErrors: number[]
  resourceErrors: number[]
  resourceRelativeErrors: number[]

  destinationHelmertRmse: number
  helmertMeasures: HelmertMeasures

  destinationPolynomial1Rmse: number
  polynomial1Measures: Polynomial1Measures
}

/**
 * Distortions
 */
export type Distortions = {
  mapId: string
  meanDistortions: Map<DistortionMeasure, number>
}
