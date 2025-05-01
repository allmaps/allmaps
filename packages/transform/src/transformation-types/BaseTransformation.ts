import { distance, rms } from '@allmaps/stdlib'

import type { Point } from '@allmaps/types'

import type {
  TransformationTypeMeasures,
  TransformationType
} from '../shared/types.js'

/**
 * Base class for transformation.
 */
export abstract class BaseTransformation {
  sourcePoints: Point[]
  destinationPoints: Point[]

  destinationTransformedSourcePoints?: Point[]

  abstract weights?: object

  type: string

  pointCount: number
  pointCountMinimum: number

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

  abstract solve(): void

  abstract evaluateFunction(_newSourcePoint: Point): Point

  abstract evaluatePartialDerivativeX(_newSourcePoint: Point): Point

  abstract evaluatePartialDerivativeY(_newSourcePoint: Point): Point

  getDestinationTransformedSourcePoints(): Point[] {
    if (!this.destinationTransformedSourcePoints) {
      this.destinationTransformedSourcePoints = this.sourcePoints.map(
        (sourcePoint) => this.evaluateFunction(sourcePoint)
      )
    }

    return this.destinationTransformedSourcePoints
  }

  getMeasures(): TransformationTypeMeasures {
    return {}
  }

  get errors() {
    const destinationTransformedSourcePoints =
      this.getDestinationTransformedSourcePoints()

    return this.destinationPoints.map((destinationPoint, index) =>
      distance(destinationPoint, destinationTransformedSourcePoints[index])
    )
  }

  get rmse() {
    const destinationTransformedSourcePoints =
      this.getDestinationTransformedSourcePoints()

    if (!this.destinationTransformedSourcePoints) {
      this.getDestinationTransformedSourcePoints()
    }

    return rms(this.destinationPoints, destinationTransformedSourcePoints)
  }
}
