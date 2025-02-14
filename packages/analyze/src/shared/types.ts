import { DistortionMeasure } from '@allmaps/transform'
import { Point } from '@allmaps/types'

export type AnalysisItem = {
  mapId: string
  code: string
  resourcePoint?: Point
  geoPoint?: Point
  gcpIndex?: number
  maskPointIndex?: number
  text: string
}

export type Measures = {
  mapId: string

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

export type Distortions = {
  mapId: string
  meanDistortions: Map<DistortionMeasure, number>
}
