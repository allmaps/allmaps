import type { Point } from '@allmaps/types'

import type { PartDer2D, TransformationType } from './shared/types'

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

  evaluate(newSourcePoint: Point, partDer: PartDer2D = { x: 0, y: 0 }): Point {
    if (partDer.x == 0 && partDer.y == 0) {
      return this.evaluateFunction(newSourcePoint)
    } else if (partDer.x == 1 && partDer.y == 0) {
      return this.evaluatePartDerX(newSourcePoint)
    } else if (partDer.x == 0 && partDer.y == 1) {
      return this.evaluatePartDerY(newSourcePoint)
    } else {
      throw new Error('Partial derivative ' + partDer + ' not supported')
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
