import { Point } from '@allmaps/types'

import { DistortionMeasure } from './shared/types.js'

export const supportedDistortionMeasures = [
  'log2sigma',
  'twoOmega',
  'airyKavr',
  'signDetJ',
  'thetaa'
]

/**
 * Compute the distortion value of selected distortion measures from the partial derivatives at a specific point
 *
 * @export
 * @param {DistortionMeasures[]} distortionMeasures - The requested distortion measures
 * @param {Point} partialDerivativeX - The partial derivative to 'x' of the transformation, evaluated at a set point
 * @param {Point} partialDerivativeY - The partial derivative to 'y' of the transformation, evaluated at a set point
 * @param {number} [referenceScale=1] - The reference area scaling (sigma) to take into account for certain distortion measures (like 'log2sigma'), e.g. computed via a helmert transform
 * @returns {Map<DistortionMeasure, number>} - A map of distortion measures and distortion values at the point
 */
export function computeDistortionsFromPartialDerivatives(
  distortionMeasures: DistortionMeasure[],
  partialDerivativeX?: Point,
  partialDerivativeY?: Point,
  referenceScale = 1
): Map<DistortionMeasure, number> {
  if (distortionMeasures.length == 0) {
    return new Map()
  }
  if (!partialDerivativeX || !partialDerivativeY) {
    return new Map(
      distortionMeasures.map((distortionMeasure) => [distortionMeasure, 0])
    )
  }
  const { E, F, a, b } = computeDistortionIntermediates(
    partialDerivativeX,
    partialDerivativeY
  )
  return new Map(
    distortionMeasures.map((distortionMeasure) => {
      if (supportedDistortionMeasures.indexOf(distortionMeasure) == -1) {
        throw new Error('Distortion ' + distortionMeasure + ' not supported')
      }
      switch (supportedDistortionMeasures.indexOf(distortionMeasure)) {
        case 0:
          return [distortionMeasure, log2sigma(a, b, referenceScale)]
        case 1:
          return [distortionMeasure, twoOmega(a, b)]
        case 2:
          return [distortionMeasure, airyKavr(a, b, referenceScale)]
        case 3:
          return [
            distortionMeasure,
            signDetJ(partialDerivativeX, partialDerivativeY)
          ]
        case 4:
          return [distortionMeasure, thetaa(partialDerivativeX, a, b, E, F)]
        default:
          return [distortionMeasure, 0]
      }
    })
  )
}

function computeDistortionIntermediates(
  partialDerivativeX: Point,
  partialDerivativeY: Point
) {
  const E = partialDerivativeX[0] ** 2 + partialDerivativeX[1] ** 2
  const F =
    partialDerivativeX[0] * partialDerivativeY[0] +
    partialDerivativeX[1] * partialDerivativeY[1]
  const G = partialDerivativeY[0] ** 2 + partialDerivativeY[1] ** 2
  const a = Math.sqrt(0.5 * (E + G + Math.sqrt((E - G) ** 2 + 4 * F ** 2)))
  const b = Math.sqrt(0.5 * (E + G - Math.sqrt((E - G) ** 2 + 4 * F ** 2)))
  return { E, F, G, a, b }
}

function log2sigma(a: number, b: number, referenceScale = 1): number {
  return (Math.log(a * b) - 2 * Math.log(referenceScale)) / Math.log(2)
}

function twoOmega(a: number, b: number): number {
  return 2 * Math.asin((a - b) / (a + b))
}

function airyKavr(a: number, b: number, referenceScale = 1): number {
  return (
    0.5 *
    (Math.log(a / referenceScale) ** 2 + Math.log(b / referenceScale) ** 2)
  )
}

function signDetJ(partialDerivativeX: Point, partialDerivativeY: Point) {
  return Math.sign(
    partialDerivativeX[0] * partialDerivativeY[1] -
      partialDerivativeX[1] * partialDerivativeY[0]
  )
}

function thetaa(
  partialDerivativeX: Point,
  a: number,
  b: number,
  E: number,
  F: number
) {
  const thetaxp = Math.atan(partialDerivativeX[1] / partialDerivativeX[0])
  const alphap =
    Math.sign(-F) * Math.asin(Math.sqrt((1 - a ** 2 / E) / (1 - (a / b) ** 2)))
  return thetaxp - alphap
}
