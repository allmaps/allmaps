import {
  arrayMatrixSize,
  newArrayMatrix,
  pasteArrayMatrix
} from '@allmaps/stdlib'

import { BaseIndependentLinearWeightsTransformation } from './BaseIndependentLinearWeightsTransformation.js'
import { solveIndependentlyPseudoInverse } from '../shared/solve-functions.js'

import type { Point, Size } from '@allmaps/types'

import type { TransformationType } from '../shared/types.js'

export abstract class BasePolynomialTransformation extends BaseIndependentLinearWeightsTransformation {
  coefsArrayMatrices: [number[][], number[][]]
  coefsArrayMatrix: number[][]
  coefsArrayMatricesSize: [Size, Size]
  coefsArrayMatrixSize: Size

  order: number

  weightsArrays?: [number[], number[]]

  constructor(
    sourcePoints: Point[],
    destinationPoints: Point[],
    order?: number
  ) {
    order = order || 1
    const pointsCountMinimum = ((order + 1) * (order + 2)) / 2
    // If there are less control points than there are coefficients to be determined (for each dimension),
    // the system can not be solved

    super(
      sourcePoints,
      destinationPoints,
      ('polynomial' + order) as TransformationType,
      pointsCountMinimum
    )

    this.order = order

    if (this.order < 1 || this.order > 3) {
      throw new Error(
        'Only polynomial transformations of order 1, 2 or 3 are supported'
      )
    }

    this.coefsArrayMatrices = this.getCoefsArrayMatrices()
    this.coefsArrayMatrix = this.coefsArrayMatrices[0]
    this.coefsArrayMatricesSize = this.coefsArrayMatrices.map(
      (coefsArrayMatrix) => arrayMatrixSize(coefsArrayMatrix)
    ) as [[number, number], [number, number]]
    this.coefsArrayMatrixSize = arrayMatrixSize(this.coefsArrayMatrix)
  }

  getDestinationPointsArrays(): [number[], number[]] {
    return [
      this.destinationPoints.map((value) => value[0]),
      this.destinationPoints.map((value) => value[1])
    ]
  }

  getCoefsArrayMatrix(): number[][] {
    let coefsArrayArray = newArrayMatrix(
      this.pointCount,
      this.pointCountMinimum,
      0
    )
    for (let i = 0; i < this.pointCount; i++) {
      coefsArrayArray = pasteArrayMatrix(coefsArrayArray, i, 0, [
        this.getSourcePointCoefsArray(this.sourcePoints[i])
      ])
    }

    return coefsArrayArray
  }

  solve() {
    this.weightsArrays = solveIndependentlyPseudoInverse(
      this.coefsArrayMatrix,
      this.destinationPointsArrays
    )
  }
}
