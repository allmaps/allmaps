import { BaseTransformation } from './BaseTransformation.js'

import type { Matrix } from 'ml-matrix'

import type { Point } from '@allmaps/types'

import type { TransformationType } from '../shared/types.js'

/**
 * Base class for transformation that are a linear combination of weights.
 */
export abstract class BaseLinearWeightsTransformation extends BaseTransformation {
  abstract destinationPointsMatrices: [Matrix, Matrix]

  abstract coefsMatrix: Matrix

  abstract weightsMatrices?: [Matrix, Matrix]
  abstract weights?: [number[], number[]]

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
    super(sourcePoints, destinationPoints, type, pointCountMinimum)
  }
}
