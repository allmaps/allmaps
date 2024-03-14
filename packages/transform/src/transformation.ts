import type { Point } from '@allmaps/types'

import type { EvaluationType, TransformationType } from './shared/types'

/**
 * Transformation class. Abstract class, extended by the various transformations.
 * */
export default abstract class Transformation {
  sourcePoints: Point[]
  destinationPoints: Point[]

  pointCount: number
  pointCountMinimum: number

  type: string

  /**
   * Create a transformation
   * @param {Point[]} sourcePoints - The source points
   * @param {Point[]} destinationPoints - The destination points
   * @param {TransformationType} type - The transformation type
   * @param {number} pointCountMinimum - The minimum number of points for the transformation type
   */
  constructor(
    sourcePoints: Point[],
    destinationPoints: Point[],
    type: TransformationType,
    pointCountMinimum: number
  ) {
    this.sourcePoints = sourcePoints
    this.destinationPoints = destinationPoints

    this.pointCount = this.sourcePoints.length

    this.type = type
    this.pointCountMinimum = pointCountMinimum

    if (this.pointCount < this.pointCountMinimum) {
      throw new Error(
        'Not enough control points. A ' +
          this.type +
          ' transformation requires a minimum of ' +
          this.pointCountMinimum +
          ' points, but ' +
          this.pointCount +
          ' are given.'
      )
    }
  }

  evaluate(newSourcePoint: Point, type: EvaluationType = 'function'): Point {
    if (type == 'function') {
      return this.evaluateFunction(newSourcePoint)
    } else if (type == 'partialDerivativeX') {
      return this.evaluatePartialDerivativeX(newSourcePoint)
    } else if (type == 'partialDerivativeY') {
      return this.evaluatePartialDerivativeY(newSourcePoint)
    } else if (
      ['log2sigma', 'twoOmega', 'AiryKavr', 'signDetJ', 'thetaa'].includes(type)
    ) {
      const partialDerivativeX = this.evaluatePartialDerivativeX(newSourcePoint)
      const partialDerivativeY = this.evaluatePartialDerivativeY(newSourcePoint)
      const E = partialDerivativeX[0] ** 2 + partialDerivativeX[1] ** 2
      const G = partialDerivativeY[0] ** 2 + partialDerivativeY[1] ** 2
      const F =
        partialDerivativeX[0] * partialDerivativeY[0] +
        partialDerivativeX[1] * partialDerivativeY[1]
      const a = Math.sqrt(0.5 * (E + G + Math.sqrt((E - G) ** 2 + 4 * F ** 2)))
      const b = Math.sqrt(0.5 * (E + G - Math.sqrt((E - G) ** 2 + 4 * F ** 2)))
      if (type == 'log2sigma') {
        const log2sigma = Math.log(a * b) / Math.log(2) // correct with Helmert scaling reference
        return [log2sigma, 0]
      } else if (type == 'twoOmega') {
        const twoOmega = 2 * Math.asin((a - b) / (a + b))
        return [twoOmega, 0]
      } else if (type == 'airyKavr') {
        const airyKavr = 0.5 * (Math.log(a) ** 2 + Math.log(b) ** 2) // correct with Helmert scaling reference
        return [airyKavr, 0]
      } else if (type == 'signDetJ') {
        const signDetJ = Math.sign(
          partialDerivativeX[0] * partialDerivativeY[1] -
            partialDerivativeX[1] * partialDerivativeY[0]
        )
        return [signDetJ, 0]
      } else if (type == 'thetaa') {
        const thetaxp = Math.atan(partialDerivativeX[1] / partialDerivativeX[0])
        const alphap =
          Math.sign(-F) *
          Math.asin(Math.sqrt((1 - a ** 2 / E) / (1 - (a / b) ** 2)))
        const thetaa = thetaxp - alphap
        return [thetaa, 0]
      } else {
        throw new Error('Evaluation of type ' + type + ' not supported')
      }
    } else {
      throw new Error('Evaluation of type ' + type + ' not supported')
    }
  }

  abstract evaluateFunction(_newSourcePoint: Point): Point

  abstract evaluatePartialDerivativeX(_newSourcePoint: Point): Point

  abstract evaluatePartialDerivativeY(_newSourcePoint: Point): Point
}
