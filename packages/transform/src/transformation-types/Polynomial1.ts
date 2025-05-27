import { BasePolynomialTransformation } from './BasePolynomialTransformation.js'

import type { Point } from '@allmaps/types'

import type { Polynomial1Measures } from '../shared/types.js'

/**
 * 2D First-order Polynomial transformation
 *
 * This transformation is a composition of a translation, rotation, scaling and shearing.
 */
export class Polynomial1 extends BasePolynomialTransformation {
  constructor(sourcePoints: Point[], destinationPoints: Point[]) {
    super(sourcePoints, destinationPoints, 1)
  }

  getSourcePointCoefsArray(sourcePoint: Point): number[] {
    return Polynomial1.getPolynomial1SourcePointCoefsArray(sourcePoint)
  }

  /**
   * Get 1x3 coefsArray, populating the Nx3 coefsArrayMatrix
   * 1 x0 y0
   * 1 x1 y1
   * 1 x2 y2
   * ...
   *
   * @param sourcePoint
   */
  static getPolynomial1SourcePointCoefsArray(sourcePoint: Point): number[] {
    return [1, sourcePoint[0], sourcePoint[1]]
  }

  getMeasures(): Polynomial1Measures {
    if (!this.weightsArrays) {
      this.solve()
    }

    if (!this.weightsArrays) {
      throw new Error('Weights not computed')
    }

    const measures: Partial<Polynomial1Measures> = {}

    // From: https://stackoverflow.com/questions/12469770/get-skew-or-rotation-value-from-affine-transformation-matrix

    measures.translation = [this.weightsArrays[0][0], this.weightsArrays[1][0]]

    const a = this.weightsArrays[0][1]
    const b = this.weightsArrays[1][1]
    const c = this.weightsArrays[0][2]
    const d = this.weightsArrays[1][2]
    const delta = a * d - b * c

    // Apply the QR-like decomposition.
    if (a != 0 || b != 0) {
      const r = Math.sqrt(a * a + b * b)
      measures.rotation = b > 0 ? Math.acos(a / r) : -Math.acos(a / r)
      measures.scales = [r, delta / r]
      measures.shears = [Math.atan((a * c + b * d) / (r * r)), 0]
    } else if (c != 0 || d != 0) {
      const s = Math.sqrt(c * c + d * d)
      measures.rotation =
        Math.PI / 2 - (d > 0 ? Math.acos(-c / s) : -Math.acos(c / s))
      measures.scales = [delta / s, s]
      measures.shears = [0, Math.atan((a * c + b * d) / (s * s))]
    } else {
      // a = b = c = d = 0
    }

    return measures as Polynomial1Measures
  }

  evaluateFunction(newSourcePoint: Point): Point {
    if (!this.weightsArrays) {
      this.solve()
    }

    if (!this.weightsArrays) {
      throw new Error('Weights not computed')
    }

    const newDestinationPoint: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      newDestinationPoint[i] +=
        this.weightsArrays[i][0] +
        this.weightsArrays[i][1] * newSourcePoint[0] +
        this.weightsArrays[i][2] * newSourcePoint[1]
    }

    return newDestinationPoint
  }

  evaluatePartialDerivativeX(_newSourcePoint: Point): Point {
    if (!this.weightsArrays) {
      this.solve()
    }

    if (!this.weightsArrays) {
      throw new Error('Weights not computed')
    }

    const newDestinationPointPartDerX: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      newDestinationPointPartDerX[i] += this.weightsArrays[i][1]
    }

    return newDestinationPointPartDerX
  }

  evaluatePartialDerivativeY(_newSourcePoint: Point): Point {
    if (!this.weightsArrays) {
      this.solve()
    }

    if (!this.weightsArrays) {
      throw new Error('Weights not computed')
    }

    const newDestinationPointPartDerY: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      newDestinationPointPartDerY[i] += this.weightsArrays[i][2]
    }

    return newDestinationPointPartDerY
  }
}
