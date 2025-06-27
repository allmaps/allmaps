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

  abstract weightsArrays?: object

  type: TransformationType

  pointCount: number
  pointCountMinimum: number

  private errors?: number[]
  private rmse?: number

  /**
   * Create a transformation
   *
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

  /**
   * Note: since (writing to and) reading from matrices is expensive,
   * we convert to and convert from ml-matrix Matrix types in this function,
   * in order not to use them in the evaluate functions.
   */
  abstract solve(): void

  /**
   * Set weights.
   *
   * The weights might be obtained in other ways then through solving
   * (e.g. through solving multiple transformation together when staping).
   * This function can be used to set weights computed elsewhere.
   */
  setWeightsArrays(weightsArrays: object): void {
    this.weightsArrays = weightsArrays
    this.processWeightsArrays()
  }

  processWeightsArrays(): void {
    return
  }

  /**
   * Evaluate the transformation function at a new point
   *
   * @param newSourcePoint - a source point
   * @returns the source point, transformed to destination space
   */
  abstract evaluateFunction(newSourcePoint: Point): Point

  /**
   * Evaluate the transformation function's partial derivative to x at a new point
   *
   * @param newSourcePoint - a source point
   * @returns the x and y component of the partial derivative to x at the source point
   */
  abstract evaluatePartialDerivativeX(newSourcePoint: Point): Point

  /**
   * Evaluate the transformation function's partial derivative to y at a new point
   *
   * @param newSourcePoint - a source point
   * @returns the x and y component of the partial derivative to y at the source point
   */
  abstract evaluatePartialDerivativeY(newSourcePoint: Point): Point

  /**
   * Get the destination-transformed source points.
   *
   * @returns source points, transformed to destination domain
   */
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

  getErrors() {
    if (!this.errors) {
      const destinationTransformedSourcePoints =
        this.getDestinationTransformedSourcePoints()

      this.errors = this.destinationPoints.map((destinationPoint, index) =>
        distance(destinationPoint, destinationTransformedSourcePoints[index])
      )
    }
    return this.errors
  }

  getRmse() {
    if (!this.rmse) {
      const destinationTransformedSourcePoints =
        this.getDestinationTransformedSourcePoints()

      if (!this.destinationTransformedSourcePoints) {
        this.getDestinationTransformedSourcePoints()
      }

      this.rmse = rms(
        this.destinationPoints,
        destinationTransformedSourcePoints
      )
    }
    return this.rmse
  }
}
