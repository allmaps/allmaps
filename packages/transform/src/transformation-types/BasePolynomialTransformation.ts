import { Matrix, pseudoInverse } from 'ml-matrix'

import { BaseLinearWeightsTransformation } from './BaseLinearWeightsTransformation.js'

import type { Point } from '@allmaps/types'

import type { TransformationType } from '../shared/types.js'

export abstract class BasePolynomialTransformation extends BaseLinearWeightsTransformation {
  order: number

  destinationPointsMatrices: [Matrix, Matrix]

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

    // 2D polynomial transformation of order 1, 2 or 3
    // This solution uses the 'Pseudo Inverse' for estimating a least-square solution, see https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse

    // The system of equations is solved for x and y separately (because they are independent)
    // Hence destinationPointsMatrices and polynomialWeightsMatrices are one Matrix
    // Since they both use the same coefficients, there is only one polynomialCoefsMatrix

    this.destinationPointsMatrices = [
      Matrix.columnVector(this.destinationPoints.map((value) => value[0])),
      Matrix.columnVector(this.destinationPoints.map((value) => value[1]))
    ]
  }

  solve() {
    // Compute polynomial weights by solving the linear system of equations for each component
    // Note: this solution uses the 'pseudo inverse' see https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse
    // This wil result in:
    // For order = 1: polynomialWeightsMatrices = [Matrix([[a0_x], [ax_x], [ay_x]]), Matrix([[a0_y], [ax_y], [ay_y]])]
    // For order = 2: ... (simirlar, following the same order as in polynomialCoefsMatrix)
    // For order = 3: ... (simirlar, following the same order as in polynomialCoefsMatrix)
    const pseudoInverseCoefsMatrix = pseudoInverse(this.coefsMatrix)

    this.weightsMatrices = [
      pseudoInverseCoefsMatrix.mmul(this.destinationPointsMatrices[0]),
      pseudoInverseCoefsMatrix.mmul(this.destinationPointsMatrices[1])
    ] as [Matrix, Matrix]

    this.weights = this.weightsMatrices.map((matrix) => matrix.to1DArray()) as [
      number[],
      number[]
    ]
  }
}
