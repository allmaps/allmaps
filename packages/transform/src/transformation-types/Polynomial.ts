import { Matrix, pseudoInverse } from 'ml-matrix'

import { BaseLinearWeightsTransformation } from './BaseLinearWeightsTransformation.js'

import type { Point } from '@allmaps/types'

import type {
  Polynomial1Measures,
  TransformationType
} from '../shared/types.js'

export class Polynomial extends BaseLinearWeightsTransformation {
  order: number

  destinationPointsMatrices: [Matrix, Matrix]

  coefsMatrix: Matrix

  weightsMatrices?: [Matrix, Matrix]
  weights?: [number[], number[]]

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
    this.coefsMatrix = Matrix.zeros(this.pointCount, this.pointCountMinimum)
    for (let i = 0; i < this.pointCount; i++) {
      switch (this.order) {
        case 1:
          this.coefsMatrix.set(i, 0, 1)
          this.coefsMatrix.set(i, 1, this.sourcePoints[i][0])
          this.coefsMatrix.set(i, 2, this.sourcePoints[i][1])
          break

        case 2:
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
          break

        case 3:
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
          break

        default:
          break
      }
    }
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

  getMeasures(): Polynomial1Measures {
    if (!this.weights) {
      this.solve()
    }

    if (!this.weights) {
      throw new Error('Weights not computed')
    }

    const measures: Partial<Polynomial1Measures> = {}

    // TODO: improve order management
    if (this.order !== 1) {
      throw new Error('Only polynomial1 weights supported')
    }

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
      switch (this.order) {
        case 1:
          newDestinationPoint[i] +=
            this.weights[i][0] +
            this.weights[i][1] * newSourcePoint[0] +
            this.weights[i][2] * newSourcePoint[1]
          break

        case 2:
          newDestinationPoint[i] +=
            this.weights[i][0] +
            this.weights[i][1] * newSourcePoint[0] +
            this.weights[i][2] * newSourcePoint[1] +
            this.weights[i][3] * newSourcePoint[0] ** 2 +
            this.weights[i][4] * newSourcePoint[1] ** 2 +
            this.weights[i][5] * newSourcePoint[0] * newSourcePoint[1]
          break

        case 3:
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
          break

        default:
          break
      }
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
      switch (this.order) {
        case 1:
          newDestinationPointPartDerX[i] += this.weights[i][1]
          break

        case 2:
          newDestinationPointPartDerX[i] +=
            this.weights[i][1] +
            2 * this.weights[i][3] * newSourcePoint[0] +
            this.weights[i][5] * newSourcePoint[1]
          break

        case 3:
          newDestinationPointPartDerX[i] +=
            this.weights[i][1] +
            2 * this.weights[i][3] * newSourcePoint[0] +
            this.weights[i][5] * newSourcePoint[1] +
            3 * this.weights[i][6] * newSourcePoint[0] ** 2 +
            2 * this.weights[i][8] * newSourcePoint[0] * newSourcePoint[1] +
            this.weights[i][9] * newSourcePoint[1] ** 2
          break

        default:
          break
      }
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
      switch (this.order) {
        case 1:
          newDestinationPointPartDerY[i] += this.weights[i][2]
          break

        case 2:
          newDestinationPointPartDerY[i] +=
            this.weights[i][2] +
            2 * this.weights[i][4] * newSourcePoint[1] +
            this.weights[i][5] * newSourcePoint[0]
          break

        case 3:
          newDestinationPointPartDerY[i] +=
            this.weights[i][2] +
            2 * this.weights[i][4] * newSourcePoint[1] +
            this.weights[i][5] * newSourcePoint[0] +
            3 * this.weights[i][7] * newSourcePoint[1] ** 2 +
            this.weights[i][8] * newSourcePoint[0] ** 2 +
            2 * this.weights[i][9] * newSourcePoint[0] * newSourcePoint[1]
          break

        default:
          break
      }
    }

    return newDestinationPointPartDerY
  }
}
