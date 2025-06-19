import { BaseTransformation } from './BaseTransformation.js'

import type { Point } from '@allmaps/types'

import type { TransformationType } from '../shared/types.js'

/**
 * Base class for transformation that are a linear combination of weights.
 *
 * In general, the system of equations for x and y are dependent on each other, and they are thus solved jointly.
 * For transformations where the system of equations for x and y are independent and can hence be solved separately, a dedicated class exists.
 */
export abstract class BaseLinearWeightsTransformation extends BaseTransformation {
  destinationPointsArrays: [number[], number[]]

  abstract weightsArrays?: [number[], number[]]

  constructor(
    sourcePoints: Point[],
    destinationPoints: Point[],
    type: TransformationType,
    pointCountMinimum: number
  ) {
    super(sourcePoints, destinationPoints, type, pointCountMinimum)

    this.destinationPointsArrays = this.getDestinationPointsArrays()
  }

  abstract getDestinationPointsArrays(): [number[], number[]]

  abstract getCoefsArrayMatrices(): [number[][], number[][]]

  abstract getSourcePointCoefsArrays(sourcePoint: Point): [number[], number[]]
}
