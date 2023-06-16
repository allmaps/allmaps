import { Matrix, pseudoInverse } from 'ml-matrix'

import type { Position } from './types.js'

export default class Affine {
  sourcePoints: Position[]
  destinationPoints: Position[]

  affineParametersMatrices?: [Matrix, Matrix]

  dimension: number

  constructor(sourcePoints: Position[], destinationPoints: Position[]) {
    // Notes on types:
    //
    // 'sourcePoints' and 'destinationPoints' are Arrays
    // sourcePoints = [[x0, y0], [x1, y1], ...]
    // destinationPoints = [[x'0, y0], [x'1, y'1], ...]
    //
    // 'destinationPointsMatrices' and 'affineParametersMatrices' is an Array of Matrices
    // destinationPointsMatrices = [Matrix([[x'0], [x'1], ...]), Matrix([[y'0], [y'1], ...])]
    // destinationPointsMatrices[i] is a Matrix of (dimension, 1)
    // affineParametersMatrices = [Matrix([[a0_x], [ax_x], [ay_x]]), Matrix([[a0_y], [ax_y], [ay_y]])]

    this.sourcePoints = sourcePoints
    this.destinationPoints = destinationPoints

    this.dimension = this.sourcePoints.length

    const destinationPointsMatrices: [Matrix, Matrix] = [
      Matrix.columnVector(destinationPoints.map((value) => value[0])),
      Matrix.columnVector(destinationPoints.map((value) => value[1]))
    ]

    // Construct Nx3 Matrix affineCoefsMatrix
    // 1 x0 y0
    // 1 x1 y1
    // 1 x2 y2
    // ...
    const affineCoefsMatrix = Matrix.zeros(this.dimension, 3)
    for (let i = 0; i < this.dimension; i++) {
      affineCoefsMatrix.set(i, 0, 1)
      affineCoefsMatrix.set(i, 1, sourcePoints[i][0])
      affineCoefsMatrix.set(i, 2, sourcePoints[i][1])
    }
    // Compute affine parameters by solving the linear system of equations for each target component
    // Note: this solution uses the 'pseudo inverse' see https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse
    const pseudoInverseAffineCoefsMatrix = pseudoInverse(affineCoefsMatrix)
    this.affineParametersMatrices = [
      pseudoInverseAffineCoefsMatrix.mmul(destinationPointsMatrices[0]),
      pseudoInverseAffineCoefsMatrix.mmul(destinationPointsMatrices[1])
    ]
  }

  // The interpolant function will compute the value at any point.
  interpolant(newSourcePoint: Position): Position {
    if (!this.affineParametersMatrices) {
      throw new Error('Affine parameters not computed')
    }

    // Compute the interpolated value by applying the affine parameters to the input point
    const newDestinationPoint: Position = [0, 0]
    for (let i = 0; i < 2; i++) {
      const a0 = this.affineParametersMatrices[i].get(0, 0)
      const ax = this.affineParametersMatrices[i].get(1, 0)
      const ay = this.affineParametersMatrices[i].get(2, 0)
      newDestinationPoint[i] +=
        a0 + ax * newSourcePoint[0] + ay * newSourcePoint[1]
    }

    return newDestinationPoint
  }
}
