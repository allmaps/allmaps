// TODO: adding these in Helmert or Straight class would be better, but failed to call from there

import { midPoint, scalePoint, translatePoint } from '@allmaps/stdlib'

import type { Point } from '@allmaps/types'

import type { StraightMeasures } from './types'

export function invertStraightMeasures(
  forwardTransformationMeasures: StraightMeasures,
  sourcePointsForward: Point[],
  destinationPointsForward: Point[]
): StraightMeasures {
  const { scale: forwardScale } = forwardTransformationMeasures

  const scale = 1 / forwardScale
  const translation = translatePoint(
    midPoint(...sourcePointsForward),
    scalePoint(midPoint(...destinationPointsForward), scale),
    'substract'
  )

  return {
    scale,
    translation
  }
}

export function invertHelmertWeightsArrays(
  forwardTransformationWeightsArrays: [number[], number[]]
): [number[], number[]] {
  const w = forwardTransformationWeightsArrays[0]
  const denominator = w[2] ** 2 + w[3] ** 2

  const backwardTransformationWeightsArray = [
    (-1 * (w[0] * w[2] + w[1] * w[3])) / denominator,
    (w[0] * w[3] - w[1] * w[2]) / denominator,
    w[2] / denominator,
    (-1 * w[3]) / denominator
  ]

  return [
    backwardTransformationWeightsArray,
    backwardTransformationWeightsArray
  ]
}

export function invertPolynomial1WeightsArrays(
  forwardTransformationWeightsArrays: [number[], number[]]
): [number[], number[]] {
  const w = forwardTransformationWeightsArrays
  const denominator = w[0][1] * w[1][2] - w[1][1] * w[0][2]

  const backwardTransformationWeightsArrays = [
    [
      (-1 * w[0][0] * w[1][2] + w[1][0] * w[0][2]) / denominator,
      w[1][2] / denominator,
      (-1 * w[0][2]) / denominator
    ],
    [
      (w[0][0] * w[1][1] - w[1][0] * w[0][1]) / denominator,
      (-1 * w[1][1]) / denominator,
      w[0][1] / denominator
    ]
  ] as [number[], number[]]

  return backwardTransformationWeightsArrays
}
