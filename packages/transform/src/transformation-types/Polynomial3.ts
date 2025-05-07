import { newArrayMatrix } from '@allmaps/stdlib'

import { BasePolynomialTransformation } from './BasePolynomialTransformation.js'

import type { Point } from '@allmaps/types'

/**
 * 2D Third-order Polynomial transformation
 *
 * For this transformations, the system of equations is solved for x and y separately.
 */
export class Polynomial3 extends BasePolynomialTransformation {
  coefsArrayMatrices: [number[][], number[][]]

  constructor(sourcePoints: Point[], destinationPoints: Point[]) {
    super(sourcePoints, destinationPoints, 3)

    // Construct Nx3 coefsArrayArray
    // for order = 3
    // 1 x0 y0 x0^2 y0^2 x0*y0 x0^3 y0^3 x0^2*y0 x0*y0^2
    // ...
    this.coefsArrayMatrices = this.getPolynomialCoefsArrayMatrices()
  }

  getSourcePointCoefsArray(sourcePoint: Point): number[] {
    return Polynomial3.getPolynomial3SourcePointCoefsArray(sourcePoint)
  }

  static getPolynomial3SourcePointCoefsArray(sourcePoint: Point): number[] {
    return [
      1,
      sourcePoint[0],
      sourcePoint[1],
      sourcePoint[0] ** 2,
      sourcePoint[1] ** 2,
      sourcePoint[0] * sourcePoint[1],
      sourcePoint[0] ** 3,
      sourcePoint[1] ** 3,
      sourcePoint[0] ** 2 * sourcePoint[1],
      sourcePoint[0] * sourcePoint[1] ** 2
    ]
  }

  // Evaluate the transformation function at a new point
  evaluateFunction(newSourcePoint: Point): Point {
    if (!this.weightsArrays) {
      this.solve()
    }

    if (!this.weightsArrays) {
      throw new Error('Weights not computed')
    }

    // Apply the helmert coefficients to the input point
    const newDestinationPoint: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      newDestinationPoint[i] +=
        this.weightsArrays[i][0] +
        this.weightsArrays[i][1] * newSourcePoint[0] +
        this.weightsArrays[i][2] * newSourcePoint[1] +
        this.weightsArrays[i][3] * newSourcePoint[0] ** 2 +
        this.weightsArrays[i][4] * newSourcePoint[1] ** 2 +
        this.weightsArrays[i][5] * newSourcePoint[0] * newSourcePoint[1] +
        this.weightsArrays[i][6] * newSourcePoint[0] ** 3 +
        this.weightsArrays[i][7] * newSourcePoint[1] ** 3 +
        this.weightsArrays[i][8] * newSourcePoint[0] ** 2 * newSourcePoint[1] +
        this.weightsArrays[i][9] * newSourcePoint[0] * newSourcePoint[1] ** 2
    }

    return newDestinationPoint
  }

  // Evaluate the transformation function's partial derivative to x at a new point
  evaluatePartialDerivativeX(newSourcePoint: Point): Point {
    if (!this.weightsArrays) {
      this.solve()
    }

    if (!this.weightsArrays) {
      throw new Error('Weights not computed')
    }

    // Apply the helmert coefficients to the input point
    const newDestinationPointPartDerX: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      newDestinationPointPartDerX[i] +=
        this.weightsArrays[i][1] +
        2 * this.weightsArrays[i][3] * newSourcePoint[0] +
        this.weightsArrays[i][5] * newSourcePoint[1] +
        3 * this.weightsArrays[i][6] * newSourcePoint[0] ** 2 +
        2 * this.weightsArrays[i][8] * newSourcePoint[0] * newSourcePoint[1] +
        this.weightsArrays[i][9] * newSourcePoint[1] ** 2
    }

    return newDestinationPointPartDerX
  }

  // Evaluate the transformation function's partial derivative to x at a new point
  evaluatePartialDerivativeY(newSourcePoint: Point): Point {
    if (!this.weightsArrays) {
      this.solve()
    }

    if (!this.weightsArrays) {
      throw new Error('Weights not computed')
    }

    // Apply the helmert coefficients to the input point
    const newDestinationPointPartDerY: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      newDestinationPointPartDerY[i] +=
        this.weightsArrays[i][2] +
        2 * this.weightsArrays[i][4] * newSourcePoint[1] +
        this.weightsArrays[i][5] * newSourcePoint[0] +
        3 * this.weightsArrays[i][7] * newSourcePoint[1] ** 2 +
        this.weightsArrays[i][8] * newSourcePoint[0] ** 2 +
        2 * this.weightsArrays[i][9] * newSourcePoint[0] * newSourcePoint[1]
    }

    return newDestinationPointPartDerY
  }
}
