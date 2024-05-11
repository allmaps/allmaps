import { Point } from '@allmaps/types'

import { DistortionMeasure } from './shared/types'

export const supportedDistortionMeasures = [
  'log2sigma',
  'twoOmega',
  'airyKavr',
  'signDetJ',
  'thetaa'
]

/**
 * Compute distortion from partial derivatives
 *
 * @export
 * @param {Point} partialDerivativeX - the partial derivative to 'x' of the transformation, evaluated at a set point
 * @param {Point} partialDerivativeY - the partial derivative to 'x' of the transformation, evaluated at a set point
 * @param {DistortionMeasure} [distortionMeasure] - the requested distortion measure, or undefined to return 0
 * @param {number} [referenceScale] - the reference area scaling (sigma) to take into account, e.g. computed via a helmert transform
 * @returns {number} - the distortion measure at the set point
 */
export function computeDistortionFromPartialDerivatives(
  partialDerivativeX: Point,
  partialDerivativeY: Point,
  distortionMeasure?: DistortionMeasure,
  referenceScale = 1
): number {
  if (!distortionMeasure) {
    return 0
  }
  const E = partialDerivativeX[0] ** 2 + partialDerivativeX[1] ** 2
  const G = partialDerivativeY[0] ** 2 + partialDerivativeY[1] ** 2
  const F =
    partialDerivativeX[0] * partialDerivativeY[0] +
    partialDerivativeX[1] * partialDerivativeY[1]
  const a = Math.sqrt(0.5 * (E + G + Math.sqrt((E - G) ** 2 + 4 * F ** 2)))
  const b = Math.sqrt(0.5 * (E + G - Math.sqrt((E - G) ** 2 + 4 * F ** 2)))
  const thetaxp = Math.atan(partialDerivativeX[1] / partialDerivativeX[0])
  const alphap =
    Math.sign(-F) * Math.asin(Math.sqrt((1 - a ** 2 / E) / (1 - (a / b) ** 2)))
  switch (supportedDistortionMeasures.indexOf(distortionMeasure)) {
    case 0:
      return (Math.log(a * b) - 2 * Math.log(referenceScale)) / Math.log(2)
    case 1:
      return 2 * Math.asin((a - b) / (a + b))
    case 2:
      return (
        0.5 *
        (Math.log(a / referenceScale) ** 2 + Math.log(b / referenceScale) ** 2)
      )
    case 3:
      return Math.sign(
        partialDerivativeX[0] * partialDerivativeY[1] -
          partialDerivativeX[1] * partialDerivativeY[0]
      )
    case 4:
      return thetaxp - alphap
    default:
      throw new Error('Distortion ' + distortionMeasure + ' not supported')
  }
}
