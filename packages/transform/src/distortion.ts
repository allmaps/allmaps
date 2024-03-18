import { Point } from '@allmaps/types'

import { DistortionMeasure } from './shared/types'

export const supportedDistortionMeasures = [
  'log2sigma',
  'twoOmega',
  'airyKavr',
  'signDetJ',
  'thetaa'
]

export function computeDistortionFromPartialDerivatives(
  partialDerivativeX: Point,
  partialDerivativeY: Point,
  distortionMeasure: DistortionMeasure,
  referenceScaling = 1
): number {
  const E = partialDerivativeX[0] ** 2 + partialDerivativeX[1] ** 2
  const G = partialDerivativeY[0] ** 2 + partialDerivativeY[1] ** 2
  const F =
    partialDerivativeX[0] * partialDerivativeY[0] +
    partialDerivativeX[1] * partialDerivativeY[1]
  const a = Math.sqrt(0.5 * (E + G + Math.sqrt((E - G) ** 2 + 4 * F ** 2)))
  const b = Math.sqrt(0.5 * (E + G - Math.sqrt((E - G) ** 2 + 4 * F ** 2)))
  switch (supportedDistortionMeasures.indexOf(distortionMeasure)) {
    case 0:
      return (Math.log(a * b) - 2 * Math.log(referenceScaling)) / Math.log(2)
    case 1:
      return 2 * Math.asin((a - b) / (a + b))
    case 2:
      return (
        0.5 *
        (Math.log(a / referenceScaling) ** 2 +
          Math.log(b / referenceScaling) ** 2)
      )
    case 3:
      return Math.sign(
        partialDerivativeX[0] * partialDerivativeY[1] -
          partialDerivativeX[1] * partialDerivativeY[0]
      )
    case 4:
      const thetaxp = Math.atan(partialDerivativeX[1] / partialDerivativeX[0])
      const alphap =
        Math.sign(-F) *
        Math.asin(Math.sqrt((1 - a ** 2 / E) / (1 - (a / b) ** 2)))
      return thetaxp - alphap
    default:
      throw new Error('Distortion ' + distortionMeasure + ' not supported')
  }
}
