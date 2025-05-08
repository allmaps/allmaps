import { BaseLinearWeightsTransformation } from './BaseLinearWeightsTransformation.js'

import type { Point } from '@allmaps/types'

import type { TransformationType } from '../shared/types.js'

/**
 * Base class for transformation that are a linear combination of weights,
 * where the system of equations for x and y are independent and can hence be solved separately.
 */
export abstract class BaseIndependentLinearWeightsTransformation extends BaseLinearWeightsTransformation {
  abstract coefsArrayMatrices: [number[][], number[][]]
  abstract coefsArrayMatrix: number[][]
  abstract coefsArrayMatricesDimensions: [[number, number], [number, number]]
  abstract coefsArrayMatrixDimensions: [number, number]

  constructor(
    sourcePoints: Point[],
    destinationPoints: Point[],
    type: TransformationType,
    pointCountMinimum: number
  ) {
    super(sourcePoints, destinationPoints, type, pointCountMinimum)
  }

  getCoefsArrayMatrices(): [number[][], number[][]] {
    const coefsArrayMatrix = this.getCoefsArrayMatrix()
    return [coefsArrayMatrix, coefsArrayMatrix]
  }

  abstract getCoefsArrayMatrix(): number[][]

  getSourcePointCoefsArrays(sourcePoint: Point): [number[], number[]] {
    const sourcePointCoefsArray = this.getSourcePointCoefsArray(sourcePoint)
    return [sourcePointCoefsArray, sourcePointCoefsArray]
  }

  abstract getSourcePointCoefsArray(sourcePoint: Point): number[]
}
