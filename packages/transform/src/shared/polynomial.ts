import { Matrix, pseudoInverse } from 'ml-matrix'

import type { Transformation } from './types'

import type { Point } from '@allmaps/types'

export default class Polynomial implements Transformation {
  sourcePoints: Point[]
  destinationPoints: Point[]

  polynomialParametersMatrices: [Matrix, Matrix]

  pointCount: number
  order: number
  nCoefs: number

  constructor(
    sourcePoints: Point[],
    destinationPoints: Point[],
    order?: number
  ) {
    this.sourcePoints = sourcePoints
    this.destinationPoints = destinationPoints

    this.pointCount = this.sourcePoints.length

    this.order = order || 1
    this.nCoefs = ((this.order + 1) * (this.order + 2)) / 2

    // if there are less control points then there are coefficients to be determined (for each dimension), the system can not be solved
    if (this.pointCount < this.nCoefs) {
      throw new Error(
        'Not enough control points. A polynomial transformation of order ' +
          this.order +
          ' requires a minimum of ' +
          this.nCoefs +
          ' points, but ' +
          this.pointCount +
          ' are given.'
      )
    }

    if (this.order < 1 || this.order > 3) {
      throw new Error(
        'Only polynomial transformations of order 1, 2 or 3 are supported'
      )
    }

    // 2D polynomial transformation of order 1, 2 or 3
    // This solution uses the 'Pseudo Inverse' for estimating a least-square solution, see https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse

    // The system of equations is solved for x and y separately (because they are independent)
    // Hence destinationPointsMatrices and polynomialParametersMatrices are one Matrix
    // Since they both use the same coefficients, there is only one polynomialCoefsMatrix

    const destinationPointsMatrices: [Matrix, Matrix] = [
      Matrix.columnVector(destinationPoints.map((value) => value[0])),
      Matrix.columnVector(destinationPoints.map((value) => value[1]))
    ]

    // Construct Nx3 Matrix polynomialCoefsMatrix
    // for order = 1
    // 1 x0 y0
    // 1 x1 y1
    // 1 x2 y2
    // ...
    // for order = 2
    // 1 x0 y0 x0^2 y0^2 x0*y0
    // ...
    // for order = 3
    // 1 x0 y0 x0^2 y0^2 x0*y0 x0^3 y0^3 x0^2*y0 x0*y0^2
    // ...
    const polynomialCoefsMatrix = Matrix.zeros(this.pointCount, this.nCoefs)
    for (let i = 0; i < this.pointCount; i++) {
      switch (this.order) {
        case 1:
          polynomialCoefsMatrix.set(i, 0, 1)
          polynomialCoefsMatrix.set(i, 1, sourcePoints[i][0])
          polynomialCoefsMatrix.set(i, 2, sourcePoints[i][1])
          break

        case 2:
          polynomialCoefsMatrix.set(i, 0, 1)
          polynomialCoefsMatrix.set(i, 1, sourcePoints[i][0])
          polynomialCoefsMatrix.set(i, 2, sourcePoints[i][1])
          polynomialCoefsMatrix.set(i, 3, sourcePoints[i][0] ** 2)
          polynomialCoefsMatrix.set(i, 4, sourcePoints[i][1] ** 2)
          polynomialCoefsMatrix.set(
            i,
            5,
            sourcePoints[i][0] * sourcePoints[i][1]
          )
          break

        case 3:
          polynomialCoefsMatrix.set(i, 0, 1)
          polynomialCoefsMatrix.set(i, 1, sourcePoints[i][0])
          polynomialCoefsMatrix.set(i, 2, sourcePoints[i][1])
          polynomialCoefsMatrix.set(i, 3, sourcePoints[i][0] ** 2)
          polynomialCoefsMatrix.set(i, 4, sourcePoints[i][1] ** 2)
          polynomialCoefsMatrix.set(
            i,
            5,
            sourcePoints[i][0] * sourcePoints[i][1]
          )
          polynomialCoefsMatrix.set(i, 6, sourcePoints[i][0] ** 3)
          polynomialCoefsMatrix.set(i, 7, sourcePoints[i][1] ** 3)
          polynomialCoefsMatrix.set(
            i,
            8,
            sourcePoints[i][0] ** 2 * sourcePoints[i][1]
          )
          polynomialCoefsMatrix.set(
            i,
            9,
            sourcePoints[i][0] * sourcePoints[i][1] ** 2
          )
          break

        default:
          break
      }
    }
    // Compute polynomial parameters by solving the linear system of equations for each target component
    // Note: this solution uses the 'pseudo inverse' see https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse
    // This wil result in:
    // For order = 1: polynomialParametersMatrices = [Matrix([[a0_x], [ax_x], [ay_x]]), Matrix([[a0_y], [ax_y], [ay_y]])]
    // For order = 2: ... (simirlar, following the same order as in polynomialCoefsMatrix)
    // For order = 3: ... (simirlar, following the same order as in polynomialCoefsMatrix)
    const pseudoInversePolynomialCoefsMatrix = pseudoInverse(
      polynomialCoefsMatrix
    )
    this.polynomialParametersMatrices = [
      pseudoInversePolynomialCoefsMatrix.mmul(destinationPointsMatrices[0]),
      pseudoInversePolynomialCoefsMatrix.mmul(destinationPointsMatrices[1])
    ]
  }

  // The interpolant function will compute the value at any point.
  interpolate(newSourcePoint: Point): Point {
    if (!this.polynomialParametersMatrices) {
      throw new Error('Polynomial parameters not computed')
    }

    // Compute the interpolated value by applying the polynomial coefficients to the input point
    const newDestinationPoint: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      switch (this.order) {
        case 1:
          newDestinationPoint[i] +=
            this.polynomialParametersMatrices[i].get(0, 0) +
            this.polynomialParametersMatrices[i].get(1, 0) * newSourcePoint[0] +
            this.polynomialParametersMatrices[i].get(2, 0) * newSourcePoint[1]
          break

        case 2:
          newDestinationPoint[i] +=
            this.polynomialParametersMatrices[i].get(0, 0) +
            this.polynomialParametersMatrices[i].get(1, 0) * newSourcePoint[0] +
            this.polynomialParametersMatrices[i].get(2, 0) * newSourcePoint[1] +
            this.polynomialParametersMatrices[i].get(3, 0) *
              newSourcePoint[0] ** 2 +
            this.polynomialParametersMatrices[i].get(4, 0) *
              newSourcePoint[1] ** 2 +
            this.polynomialParametersMatrices[i].get(5, 0) *
              newSourcePoint[0] *
              newSourcePoint[1]
          break

        case 3:
          newDestinationPoint[i] +=
            this.polynomialParametersMatrices[i].get(0, 0) +
            this.polynomialParametersMatrices[i].get(1, 0) * newSourcePoint[0] +
            this.polynomialParametersMatrices[i].get(2, 0) * newSourcePoint[1] +
            this.polynomialParametersMatrices[i].get(3, 0) *
              newSourcePoint[0] ** 2 +
            this.polynomialParametersMatrices[i].get(4, 0) *
              newSourcePoint[1] ** 2 +
            this.polynomialParametersMatrices[i].get(5, 0) *
              newSourcePoint[0] *
              newSourcePoint[1] +
            this.polynomialParametersMatrices[i].get(6, 0) *
              newSourcePoint[0] ** 3 +
            this.polynomialParametersMatrices[i].get(7, 0) *
              newSourcePoint[1] ** 3 +
            this.polynomialParametersMatrices[i].get(8, 0) *
              newSourcePoint[0] ** 2 *
              newSourcePoint[1] +
            this.polynomialParametersMatrices[i].get(9, 0) *
              newSourcePoint[0] *
              newSourcePoint[1] ** 2
          break

        default:
          break
      }
    }

    return newDestinationPoint
  }
}
