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

  evaluate(
    newSourcePoint: Point,
    evaluationType: EvaluationType = 'function'
  ): Point {
    if (evaluationType == 'function') {
      return this.evaluateFunction(newSourcePoint)
    } else if (evaluationType == 'partialDerivativeX') {
      return this.evaluatePartialDerivativeX(newSourcePoint)
    } else if (evaluationType == 'partialDerivativeY') {
      return this.evaluatePartialDerivativeY(newSourcePoint)
    } else {
      throw new Error('Evaluation of type ' + evaluationType + ' not supported')
    }
  }

  abstract evaluateFunction(_newSourcePoint: Point): Point

  abstract evaluatePartialDerivativeX(_newSourcePoint: Point): Point

  abstract evaluatePartialDerivativeY(_newSourcePoint: Point): Point
}
