import { Matrix } from 'ml-matrix'

import { BasePolynomialTransformation } from './BasePolynomialTransformation.js'

import type { Point } from '@allmaps/types'

export class Polynomial3 extends BasePolynomialTransformation {
  coefsMatrix: Matrix

  weightsMatrices?: [Matrix, Matrix]
  weights?: [number[], number[]]

  constructor(sourcePoints: Point[], destinationPoints: Point[]) {
    super(sourcePoints, destinationPoints, 3)

    // Construct Nx3 Matrix polynomialCoefsMatrix
    // for order = 3
    // 1 x0 y0 x0^2 y0^2 x0*y0 x0^3 y0^3 x0^2*y0 x0*y0^2
    // ...
    this.coefsMatrix = Matrix.zeros(this.pointCount, this.pointCountMinimum)
    for (let i = 0; i < this.pointCount; i++) {
      this.coefsMatrix.set(i, 0, 1)
      this.coefsMatrix.set(i, 1, this.sourcePoints[i][0])
      this.coefsMatrix.set(i, 2, this.sourcePoints[i][1])
      this.coefsMatrix.set(i, 3, this.sourcePoints[i][0] ** 2)
      this.coefsMatrix.set(i, 4, this.sourcePoints[i][1] ** 2)
      this.coefsMatrix.set(
        i,
        5,
        this.sourcePoints[i][0] * this.sourcePoints[i][1]
      )
      this.coefsMatrix.set(i, 6, this.sourcePoints[i][0] ** 3)
      this.coefsMatrix.set(i, 7, this.sourcePoints[i][1] ** 3)
      this.coefsMatrix.set(
        i,
        8,
        this.sourcePoints[i][0] ** 2 * this.sourcePoints[i][1]
      )
      this.coefsMatrix.set(
        i,
        9,
        this.sourcePoints[i][0] * this.sourcePoints[i][1] ** 2
      )
    }
  }

  // Evaluate the transformation function at a new point
  evaluateFunction(newSourcePoint: Point): Point {
    if (!this.weights) {
      this.solve()
    }

    if (!this.weights) {
      throw new Error('Weights not computed')
    }

    // Apply the helmert coefficients to the input point
    const newDestinationPoint: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      newDestinationPoint[i] +=
        this.weights[i][0] +
        this.weights[i][1] * newSourcePoint[0] +
        this.weights[i][2] * newSourcePoint[1] +
        this.weights[i][3] * newSourcePoint[0] ** 2 +
        this.weights[i][4] * newSourcePoint[1] ** 2 +
        this.weights[i][5] * newSourcePoint[0] * newSourcePoint[1] +
        this.weights[i][6] * newSourcePoint[0] ** 3 +
        this.weights[i][7] * newSourcePoint[1] ** 3 +
        this.weights[i][8] * newSourcePoint[0] ** 2 * newSourcePoint[1] +
        this.weights[i][9] * newSourcePoint[0] * newSourcePoint[1] ** 2
    }

    return newDestinationPoint
  }

  // Evaluate the transformation function's partial derivative to x at a new point
  evaluatePartialDerivativeX(newSourcePoint: Point): Point {
    if (!this.weights) {
      this.solve()
    }

    if (!this.weights) {
      throw new Error('Weights not computed')
    }

    // Apply the helmert coefficients to the input point
    const newDestinationPointPartDerX: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      newDestinationPointPartDerX[i] +=
        this.weights[i][1] +
        2 * this.weights[i][3] * newSourcePoint[0] +
        this.weights[i][5] * newSourcePoint[1] +
        3 * this.weights[i][6] * newSourcePoint[0] ** 2 +
        2 * this.weights[i][8] * newSourcePoint[0] * newSourcePoint[1] +
        this.weights[i][9] * newSourcePoint[1] ** 2
    }

    return newDestinationPointPartDerX
  }

  // Evaluate the transformation function's partial derivative to x at a new point
  evaluatePartialDerivativeY(newSourcePoint: Point): Point {
    if (!this.weights) {
      this.solve()
    }

    if (!this.weights) {
      throw new Error('Weights not computed')
    }

    // Apply the helmert coefficients to the input point
    const newDestinationPointPartDerY: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      newDestinationPointPartDerY[i] +=
        this.weights[i][2] +
        2 * this.weights[i][4] * newSourcePoint[1] +
        this.weights[i][5] * newSourcePoint[0] +
        3 * this.weights[i][7] * newSourcePoint[1] ** 2 +
        this.weights[i][8] * newSourcePoint[0] ** 2 +
        2 * this.weights[i][9] * newSourcePoint[0] * newSourcePoint[1]
    }

    return newDestinationPointPartDerY
  }
}
