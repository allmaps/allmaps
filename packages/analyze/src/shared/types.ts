import { DistortionMeasure } from '@allmaps/transform'
import {
  HelmertMeasures,
  Polynomial1Measures
} from '@allmaps/transform/shared/types'
import { Point } from '@allmaps/types'

/**
 * Proto version of GeoreferencedMap
 */
export type ProtoGeoreferencedMap = {
  gcps?: { resource?: Point; geo?: Point }[]
  resourceMask?: Point[]
}

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
  gcpIndex?: number
  maskPointIndex?: number
  message: string
  originalMessage?: unknown
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

export type InfoCode = 'maskequalsfullmask' | 'gcpresourcepointismaskpoint'
export type WarningCode =
  | 'maskmissing'
  | 'gcpoutsidemask'
  | 'maskpointoutsidefullmask'
  | 'destinationrmsetoohigh'
  | 'destinationhelmertrmsetoohigh'
  | 'polynomial1sheartoohigh'
  | 'destinationpolynomial1rmsetoohigh'
  | 'log2sigmadistortiontoohigh'
  | 'twoomegadistortiontoohigh'
  | 'triangulationfoldsover'
export type ErrorCode =
  | 'constructinggeoreferencedmapfailed'
  | 'constructingtriangulatedwarpedmapfailed'
  | 'constructingwarpedmapfailed'
  | 'gcpincompleteresource'
  | 'gcpincompleteregeo'
  | 'gcpsnotlinearlyindependent'
  | 'gcpsmissing'
  | 'gcpsamountlessthen2'
  | 'gcpsamountlessthen3'
  | 'gcpresourcerepeatedpoint'
  | 'gcpgeorepeatedpoint'
  | 'masknotring'
  | 'maskrepeatedpoint'
  | 'maskselfintersection'

/**
 * Measures
 */
export type Measures = {
  mapId?: string

  resourceMaskBboxDiameter: number
  projectedGeoMaskBboxDiameter: number

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
