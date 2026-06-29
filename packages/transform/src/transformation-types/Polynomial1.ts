import { BasePolynomialTransformation } from './BasePolynomialTransformation.js'

import type { HomogeneousTransform, Point } from '@allmaps/types'

import type { Polynomial1Measures } from '../shared/types.js'

/**
 * 2D First-order Polynomial transformation
 *
 * This transformation is a composition of a translation, rotation, scaling and shearing.
 */
export class Polynomial1 extends BasePolynomialTransformation {
  measures?: Polynomial1Measures

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

  getHomogeneousTransform(): HomogeneousTransform | undefined {
    const weightsArrays = this.getWeightsArrays()

    return [
      weightsArrays[0][1],
      weightsArrays[1][1],
      weightsArrays[0][2],
      weightsArrays[1][2],
      weightsArrays[0][0],
      weightsArrays[1][0]
    ]
  }

  setWeightsArraysFromHomogeneousTransform(
    homogeneousTransform: HomogeneousTransform
  ): void {
    this.weightsArrays = [
      [
        homogeneousTransform[4],
        homogeneousTransform[0],
        homogeneousTransform[2]
      ],
      [
        homogeneousTransform[5],
        homogeneousTransform[1],
        homogeneousTransform[3]
      ]
    ]
  }

  getMeasures(): Polynomial1Measures {
    if (!this.measures) {
      const weightsArrays = this.getWeightsArrays()

      // From: https://stackoverflow.com/questions/12469770/get-skew-or-rotation-value-from-affine-transformation-matrix

      const translation = [weightsArrays[0][0], weightsArrays[1][0]] as Point

      const a = weightsArrays[0][1]
      const b = weightsArrays[1][1]
      const c = weightsArrays[0][2]
      const d = weightsArrays[1][2]
      const delta = a * d - b * c

      // Apply the QR-like decomposition.
      let rotation, scales, shears
      if (a != 0 || b != 0) {
        const r = Math.sqrt(a * a + b * b)
        rotation = b > 0 ? Math.acos(a / r) : -Math.acos(a / r)
        scales = [r, delta / r] as Point
        shears = [Math.atan((a * c + b * d) / (r * r)), 0] as Point
      } else if (c != 0 || d != 0) {
        const s = Math.sqrt(c * c + d * d)
        rotation = Math.PI / 2 - (d > 0 ? Math.acos(-c / s) : -Math.acos(c / s))
        scales = [delta / s, s] as Point
        shears = [0, Math.atan((a * c + b * d) / (s * s))] as Point
      } else {
        // a = b = c = d = 0
        throw new Error("Can't compute measures")
      }

      this.measures = { translation, rotation, scales, shears }
    }

    return this.measures
  }

  evaluateFunction(newSourcePoint: Point): Point {
    const weightsArrays = this.getWeightsArrays()

    const newDestinationPoint: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      newDestinationPoint[i] +=
        weightsArrays[i][0] +
        weightsArrays[i][1] * newSourcePoint[0] +
        weightsArrays[i][2] * newSourcePoint[1]
    }

    return newDestinationPoint
  }

  evaluatePartialDerivativeX(_newSourcePoint: Point): Point {
    const weightsArrays = this.getWeightsArrays()

    const newDestinationPointPartDerX: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      newDestinationPointPartDerX[i] += weightsArrays[i][1]
    }

    return newDestinationPointPartDerX
  }

  evaluatePartialDerivativeY(_newSourcePoint: Point): Point {
    const weightsArrays = this.getWeightsArrays()

    const newDestinationPointPartDerY: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      newDestinationPointPartDerY[i] += weightsArrays[i][2]
    }

    return newDestinationPointPartDerY
  }
}
