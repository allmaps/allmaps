import { BasePolynomialTransformation } from './BasePolynomialTransformation.js'

import type { Point } from '@allmaps/types'

/**
 * 2D Second-order Polynomial transformation
 */
export class Polynomial2 extends BasePolynomialTransformation {
  constructor(sourcePoints: Point[], destinationPoints: Point[]) {
    super(sourcePoints, destinationPoints, 2)
  }

  getSourcePointCoefsArray(sourcePoint: Point): number[] {
    return Polynomial2.getPolynomial2SourcePointCoefsArray(sourcePoint)
  }

  /**
   * Get 1x3 coefsArray, populating the Nx3 coefsArrayMatrix
   * 1 x0 y0 x0^2 y0^2 x0*y0
   * ...
   *
   * @param sourcePoint
   */
  static getPolynomial2SourcePointCoefsArray(sourcePoint: Point): number[] {
    return [
      1,
      sourcePoint[0],
      sourcePoint[1],
      sourcePoint[0] ** 2,
      sourcePoint[1] ** 2,
      sourcePoint[0] * sourcePoint[1]
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
        this.weightsArrays[i][5] * newSourcePoint[0] * newSourcePoint[1]
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
        this.weightsArrays[i][5] * newSourcePoint[1]
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
        this.weightsArrays[i][5] * newSourcePoint[0]
    }

    return newDestinationPointPartDerY
  }
}
