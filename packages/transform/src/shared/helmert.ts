import { Matrix, pseudoInverse } from 'ml-matrix'

import type { Position } from './types.js'

export default class Polynomial {
  sourcePoints: Position[]
  destinationPoints: Position[]

  helmertParametersMatrix?: Matrix

  nPoints: number
  constructor(sourcePoints: Position[], destinationPoints: Position[]) {
    // Notes on types:
    //
    // 'sourcePoints' and 'destinationPoints' are Arrays
    // sourcePoints = [[x0, y0], [x1, y1], ...]
    // destinationPoints = [[x'0, y0], [x'1, y'1], ...]
    //
    // 'destinationPointsMatrix' and 'helmertParametersMatrix' are each a Matrix
    // destinationPointsMatrices = Matrix([[x'0], [y'0], [x'1], [y'1], ...])
    // helmertParametersMatrix = Matrix([[t_x], [t_y], [m], [n]])

    this.sourcePoints = sourcePoints
    this.destinationPoints = destinationPoints

    this.nPoints = this.sourcePoints.length

    if (this.nPoints < 2) {
      throw new Error(
        'Not enough controle points. A helmert transformation requires a minimum of 2 points, but ' +
          this.nPoints +
          ' are given.'
      )
    }

    const destinationPointsMatrix: Matrix = Matrix.columnVector(
      destinationPoints.flat()
    )

    // Construct 2Nx4 Matrix helmertCoefsMatrix
    // 1 0 x0 -y0
    // 0 1 y0 x0
    // 1 0 x1 -y1
    // 0 1 y1 x1
    // ...
    //
    const helmertCoefsMatrix = Matrix.zeros(2 * this.nPoints, 4)
    for (let i = 0; i < this.nPoints; i++) {
      helmertCoefsMatrix.set(2 * i, 0, 1)
      helmertCoefsMatrix.set(2 * i + 1, 0, 0)
      helmertCoefsMatrix.set(2 * i, 1, 0)
      helmertCoefsMatrix.set(2 * i + 1, 1, 1)
      helmertCoefsMatrix.set(2 * i, 2, sourcePoints[i][0])
      helmertCoefsMatrix.set(2 * i + 1, 2, sourcePoints[i][1])
      helmertCoefsMatrix.set(2 * i, 3, -sourcePoints[i][1])
      helmertCoefsMatrix.set(2 * i + 1, 3, sourcePoints[i][0])
    }
    // Compute helmert parameters by solving the linear system of equations for each target component
    // Note: this solution uses the 'pseudo inverse' see https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse
    const pseudoInversehelmertCoefsMatrix = pseudoInverse(helmertCoefsMatrix)
    this.helmertParametersMatrix = pseudoInversehelmertCoefsMatrix.mmul(
      destinationPointsMatrix
    )
  }

  // The interpolant function will compute the value at any point.
  interpolant(newSourcePoint: Position): Position {
    if (!this.helmertParametersMatrix) {
      throw new Error('Helmert parameters not computed')
    }

    // Compute the interpolated value by applying the polynomial coefficients to the input point
    const newDestinationPoint: Position = [
      // [a(1)+a(3)*ps_ref(1,:)-a(4)*ps_ref(2,:), a(2)+a(4)*ps_ref(1,:)+a(3)*ps_ref(2,:)],
      this.helmertParametersMatrix.get(0, 0) +
        this.helmertParametersMatrix.get(2, 0) * newSourcePoint[0] -
        this.helmertParametersMatrix.get(3, 0) * newSourcePoint[1],
      this.helmertParametersMatrix.get(1, 0) +
        this.helmertParametersMatrix.get(3, 0) * newSourcePoint[0] +
        this.helmertParametersMatrix.get(2, 0) * newSourcePoint[1]
    ]

    return newDestinationPoint
  }
}
