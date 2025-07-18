import { distance, rms } from '@allmaps/stdlib'

import type { Point } from '@allmaps/types'

import type { TransformationType } from '../shared/types.js'

/**
 * Transformation class. Abstract class, extended by the various transformations.
 */
export abstract class BaseTransformation {
  sourcePoints: Point[]
  destinationPoints: Point[]

  destinationTransformedSourcePoints?: Point[]

  pointCount: number
  pointCountMinimum: number

  type: string

  /**
   * Create a transformation
   * @param sourcePoints - The source points
   * @param destinationPoints - The destination points
   * @param type - The transformation type
   * @param pointCountMinimum - The minimum number of points for the transformation type
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

  computeDestinationTransformedSourcePoints(): Point[] {
    this.destinationTransformedSourcePoints = this.sourcePoints.map(
      (sourcePoint) => this.evaluateFunction(sourcePoint)
    )

    return this.destinationTransformedSourcePoints
  }

  get errors() {
    let destinationTransformedSourcePoints =
      this.destinationTransformedSourcePoints
    if (!destinationTransformedSourcePoints) {
      destinationTransformedSourcePoints =
        this.computeDestinationTransformedSourcePoints()
    }

    return this.destinationPoints.map((destinationPoint, index) =>
      distance(destinationPoint, destinationTransformedSourcePoints[index])
    )
  }

  get rmse() {
    let destinationTransformedSourcePoints =
      this.destinationTransformedSourcePoints
    if (!destinationTransformedSourcePoints) {
      destinationTransformedSourcePoints =
        this.computeDestinationTransformedSourcePoints()
    }

    if (!this.destinationTransformedSourcePoints) {
      this.computeDestinationTransformedSourcePoints()
    }

    return rms(this.destinationPoints, destinationTransformedSourcePoints)
  }

  abstract evaluateFunction(_newSourcePoint: Point): Point

  abstract evaluatePartialDerivativeX(_newSourcePoint: Point): Point

  abstract evaluatePartialDerivativeY(_newSourcePoint: Point): Point
}
