import { Matrix } from 'ml-matrix'

import { BasePolynomialTransformation } from './BasePolynomialTransformation.js'

import type { Point } from '@allmaps/types'

import type { Polynomial1Measures } from '../shared/types.js'

export class Polynomial1 extends BasePolynomialTransformation {
  coefsMatrix: Matrix

  weightsMatrices?: [Matrix, Matrix]
  weights?: [number[], number[]]

  constructor(sourcePoints: Point[], destinationPoints: Point[]) {
    super(sourcePoints, destinationPoints, 1)

    // Construct Nx3 Matrix polynomialCoefsMatrix
    // 1 x0 y0
    // 1 x1 y1
    // 1 x2 y2
    // ...
    this.coefsMatrix = Matrix.zeros(this.pointCount, this.pointCountMinimum)
    for (let i = 0; i < this.pointCount; i++) {
      this.coefsMatrix.set(i, 0, 1)
      this.coefsMatrix.set(i, 1, this.sourcePoints[i][0])
      this.coefsMatrix.set(i, 2, this.sourcePoints[i][1])
    }
  }

  getMeasures(): Polynomial1Measures {
    if (!this.weights) {
      this.solve()
    }

    if (!this.weights) {
      throw new Error('Weights not computed')
    }

    const measures: Partial<Polynomial1Measures> = {}

    // From: https://stackoverflow.com/questions/12469770/get-skew-or-rotation-value-from-affine-transformation-matrix

    measures.translation = [this.weights[0][0], this.weights[1][0]]

    const a = this.weights[0][1]
    const b = this.weights[1][1]
    const c = this.weights[0][2]
    const d = this.weights[1][2]
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
        this.weights[i][2] * newSourcePoint[1]
    }

    return newDestinationPoint
  }

  // Evaluate the transformation function's partial derivative to x at a new point
  evaluatePartialDerivativeX(_newSourcePoint: Point): Point {
    if (!this.weights) {
      this.solve()
    }

    if (!this.weights) {
      throw new Error('Weights not computed')
    }

    // Apply the helmert coefficients to the input point
    const newDestinationPointPartDerX: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      newDestinationPointPartDerX[i] += this.weights[i][1]
    }

    return newDestinationPointPartDerX
  }

  // Evaluate the transformation function's partial derivative to x at a new point
  evaluatePartialDerivativeY(_newSourcePoint: Point): Point {
    if (!this.weights) {
      this.solve()
    }

    if (!this.weights) {
      throw new Error('Weights not computed')
    }

    // Apply the helmert coefficients to the input point
    const newDestinationPointPartDerY: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      newDestinationPointPartDerY[i] += this.weights[i][2]
    }

    return newDestinationPointPartDerY
  }
}
