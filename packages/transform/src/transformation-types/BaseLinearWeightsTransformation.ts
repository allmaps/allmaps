import { BaseTransformation } from './BaseTransformation.js'

import type { Point } from '@allmaps/types'

import type { TransformationType } from '../shared/types.js'

/**
 * Base class for transformation that are a linear combination of weights.
 *
 * For some of these transformations, the system of equations is solved for x and y jointly using the 'joint' properties
 * For other, the system of equations is solved for x and y separately, and the obtained weights can be used for both.
 */
export abstract class BaseLinearWeightsTransformation extends BaseTransformation {
  abstract destinationPointsArrays: [number[], number[]]

  abstract coefsArrayMatrices: [number[][], number[][]]

  abstract weightsArrays?: [number[], number[]]

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
    super(sourcePoints, destinationPoints, type, pointCountMinimum)
  }

  abstract getSourcePointCoefsArray(sourcePoint: Point): number[]
}
