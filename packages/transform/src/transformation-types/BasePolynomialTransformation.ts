import { Matrix, pseudoInverse } from 'ml-matrix'

import {
  arrayMatrixSize,
  newArrayMatrix,
  pasteArrayMatrix
} from '@allmaps/stdlib'

import { BaseIndependentLinearWeightsTransformation } from './BaseIndependentLinearWeightsTransformation.js'

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

  /**
   * Solve the x and y components independently.
   *
   * This uses the 'Pseudo Inverse' to compute (for each component, using the same coefs for both)
   * a 'best fit' (least squares) approximate solution for the system of linear equations
   * which is (in general) over-defined and hence lacks an exact solution.
   *
   * See https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse
   *
   * This wil result in a weights array for each component:
   * For order = 1: this.weight = [[a0_x, ax_x, ay_x], [a0_y, ax_y, ay_y]]
   * For order = 2: ... (similar, following the same order as in coefsArrayMatrix)
   * For order = 3: ... (similar, following the same order as in coefsArrayMatrix)
   */
  solve() {
    const coefsMatrix = new Matrix(this.coefsArrayMatrices[0])
    const destinationPointsMatrices = [
      Matrix.columnVector(this.destinationPointsArrays[0]),
      Matrix.columnVector(this.destinationPointsArrays[1])
    ]

    const pseudoInverseCoefsMatrix = pseudoInverse(coefsMatrix)

    const weightsMatrices = [
      pseudoInverseCoefsMatrix.mmul(destinationPointsMatrices[0]),
      pseudoInverseCoefsMatrix.mmul(destinationPointsMatrices[1])
    ] as [Matrix, Matrix]

    this.weightsArrays = weightsMatrices.map((matrix) =>
      matrix.to1DArray()
    ) as [number[], number[]]
  }
}
