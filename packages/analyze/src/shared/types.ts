import { DistortionMeasure } from '@allmaps/transform'
import { Point } from '@allmaps/types'

/**
 * Analysis options
 */
export type AnalysisOptions = {
  codes: string[]
}

/**
 * Analysis item
 */
export type AnalysisItem = {
  mapId?: string
  code: string
  resourcePoint?: Point
  geoPoint?: Point
  gcpIndex?: number
  maskPointIndex?: number
  message: string
  originalMessage?: string
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

  rmse: number
  destinationErrors: number[]
  resourceErrors: number[]
  resourceRelativeErrors: number[]

  helmertRmse: number
  helmertParameters: number[]
  helmertScale: number
  helmertRotation: number
  helmertTranslation: Point

  polynomialRmse: number
  polynomialParameters: [number[], number[]]
  polynomialScale: Point
  polynomialRotation: number
  polynomialShear: Point
  polynomialTranslation: Point
}

/**
 * Distortions
 */
export type Distortions = {
  mapId: string
  meanDistortions: Map<DistortionMeasure, number>
}
