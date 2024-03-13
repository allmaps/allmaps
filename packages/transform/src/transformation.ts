import type { Point } from '@allmaps/types'

import type { EvaluationType, TransformationType } from './shared/types'

/**
 * Transformation class. Extended by the various transformations.
 * */
export default class Transformation {
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
   * @param {pointCountMinimum} - The minimum number of points for the transformation type
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
    } else if (type == 'parDerX') {
      return this.evaluatePartDerX(newSourcePoint)
    } else if (type == 'parDerY') {
      return this.evaluatePartDerY(newSourcePoint)
    } else if (
      ['log2sigma', '2Omega', 'AiryKavr', 'signDetJ', 'thetaa'].includes(type)
    ) {
      const partDerX = this.evaluatePartDerX(newSourcePoint)
      const partDerY = this.evaluatePartDerY(newSourcePoint)
      const E = partDerX[0] ** 2 + partDerX[1] ** 2
      const G = partDerY[0] ** 2 + partDerY[1] ** 2
      const F = partDerX[0] * partDerY[0] + partDerX[1] * partDerY[1]
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
          partDerX[0] * partDerY[1] - partDerX[1] * partDerY[0]
        )
        return [signDetJ, 0]
      } else if (type == 'thetaa') {
        const thetaxp = Math.atan(partDerX[1] / partDerX[0])
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

  // Placeholder function, implemented by extending classes
  evaluateFunction(_newSourcePoint: Point): Point {
    throw new Error(
      'Evaluation of transformation function not implemented for ' + this.type
    )
  }

  // Placeholder function, implemented by extending classes
  evaluatePartDerX(_newSourcePoint: Point): Point {
    throw new Error(
      "Evaluation of transformation function's partial derivative to x not implemented for " +
        this.type
    )
  }

  // Placeholder function, implemented by extending classes
  evaluatePartDerY(_newSourcePoint: Point): Point {
    throw new Error(
      "Evaluation of transformation function's partial derivative to y not implemented for " +
        this.type
    )
  }
}
