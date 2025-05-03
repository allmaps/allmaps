import { Matrix, SingularValueDecomposition } from 'ml-matrix'

import { newArrayMatrix } from '@allmaps/stdlib'

import { BaseTransformation } from './BaseTransformation.js'

import type { Point } from '@allmaps/types'

/**
 * 2D projective (= perspective) transformation
 *
 * For this transformations, the system of equations is solved for x and y jointly.
 *
 * See for more information:
 * Dubrofsky, Elan. "Homography estimation." Diplomová práce. Vancouver: Univerzita Britské Kolumbie 5 (2009).
 * https://citeseerx.ist.psu.edu/doc/10.1.1.186.4411
 * https://www.cs.ubc.ca/sites/default/files/2022-12/Dubrofsky_Elan.pdf
 */
export class Projective extends BaseTransformation {
  coefsArrayMatrices: [number[][], number[][]]

  weightsArrays?: number[][]

  constructor(sourcePoints: Point[], destinationPoints: Point[]) {
    super(sourcePoints, destinationPoints, 'projective', 4)

    // Construct two Nx9 Matrix projectiveCoefsMatrix
    // −x0 −y0 −1  0   0   0  x'0x0 x'0y0 x'0
    // ...
    // 0   0   0   −x0 −y0 −1 y'0x0 y'0y0 y'0
    // ...
    this.coefsArrayMatrices = [
      newArrayMatrix(this.pointCount, 9, 0),
      newArrayMatrix(this.pointCount, 9, 0)
    ]
    for (let i = 0; i < this.pointCount; i++) {
      this.coefsArrayMatrices[0][i][0] = -sourcePoints[i][0]
      this.coefsArrayMatrices[0][i][1] = -sourcePoints[i][1]
      this.coefsArrayMatrices[0][i][2] = -1
      this.coefsArrayMatrices[0][i][3] = 0
      this.coefsArrayMatrices[0][i][4] = 0
      this.coefsArrayMatrices[0][i][5] = 0
      this.coefsArrayMatrices[0][i][6] =
        destinationPoints[i][0] * sourcePoints[i][0]

      this.coefsArrayMatrices[0][i][7] =
        destinationPoints[i][0] * sourcePoints[i][1]

      this.coefsArrayMatrices[0][i][8] = destinationPoints[i][0]
      this.coefsArrayMatrices[1][i][0] = 0
      this.coefsArrayMatrices[1][i][1] = 0
      this.coefsArrayMatrices[1][i][2] = 0
      this.coefsArrayMatrices[1][i][3] = -sourcePoints[i][0]
      this.coefsArrayMatrices[1][i][4] = -sourcePoints[i][1]
      this.coefsArrayMatrices[1][i][5] = -1
      this.coefsArrayMatrices[1][i][6] =
        destinationPoints[i][1] * sourcePoints[i][0]

      this.coefsArrayMatrices[1][i][7] =
        destinationPoints[i][1] * sourcePoints[i][1]

      this.coefsArrayMatrices[1][i][8] = destinationPoints[i][1]
    }
  }

  /**
   * Solve the x and y components jointly.
   *
   * This uses a singular value decomposition to compute the last (i.e. 9th) 'right singular vector',
   * i.e. the one with the smallest singular value, wich holds the weights for the solution.
   * Note that for a set of gcps that exactly follow a projective transformations,
   * the singular value is null and this vector spans the null-space.
   *
   * This wil result in a weights array for each component with rbf weights and affine weights.
   */
  solve() {
    // Joint coefs in the same order as in the paper
    // (Otherwise the weights may differ in sign, even though this should not affect the result)
    const coefsMatrix = []
    for (let i = 0; i < this.pointCount; i++) {
      coefsMatrix.push(this.coefsArrayMatrices[0][i])
      coefsMatrix.push(this.coefsArrayMatrices[1][i])
    }

    const svdCoefsMatrix = new SingularValueDecomposition(coefsMatrix)

    const weightsMatrix = Matrix.from1DArray(
      3,
      3,
      svdCoefsMatrix.rightSingularVectors.getColumn(8)
    ).transpose()
    this.weightsArrays = weightsMatrix.to2DArray()
  }

  evaluateFunction(newSourcePoint: Point): Point {
    if (!this.weightsArrays) {
      this.solve()
    }

    if (!this.weightsArrays) {
      throw new Error('Weights not computed')
    }

    const c =
      this.weightsArrays[0][2] * newSourcePoint[0] +
      this.weightsArrays[1][2] * newSourcePoint[1] +
      this.weightsArrays[2][2]
    const num1 =
      this.weightsArrays[0][0] * newSourcePoint[0] +
      this.weightsArrays[1][0] * newSourcePoint[1] +
      this.weightsArrays[2][0]
    const num2 =
      this.weightsArrays[0][1] * newSourcePoint[0] +
      this.weightsArrays[1][1] * newSourcePoint[1] +
      this.weightsArrays[2][1]
    const newDestinationPoint: Point = [num1 / c, num2 / c]

    return newDestinationPoint
  }

  evaluatePartialDerivativeX(newSourcePoint: Point): Point {
    if (!this.weightsArrays) {
      this.solve()
    }

    if (!this.weightsArrays) {
      throw new Error('Weights not computed')
    }

    const c =
      this.weightsArrays[0][2] * newSourcePoint[0] +
      this.weightsArrays[1][2] * newSourcePoint[1] +
      this.weightsArrays[2][2]
    const num1 =
      this.weightsArrays[0][0] * newSourcePoint[0] +
      this.weightsArrays[1][0] * newSourcePoint[1] +
      this.weightsArrays[2][0]
    const num2 =
      this.weightsArrays[0][1] * newSourcePoint[0] +
      this.weightsArrays[1][1] * newSourcePoint[1] +
      this.weightsArrays[2][1]
    const newDestinationPointPartDerX: Point = [
      (c * this.weightsArrays[0][0] - this.weightsArrays[0][2] * num1) / c ** 2,
      (c * this.weightsArrays[0][1] - this.weightsArrays[0][2] * num2) / c ** 2
    ]

    return newDestinationPointPartDerX
  }

  evaluatePartialDerivativeY(newSourcePoint: Point): Point {
    if (!this.weightsArrays) {
      this.solve()
    }

    if (!this.weightsArrays) {
      throw new Error('Weights not computed')
    }

    const c =
      this.weightsArrays[0][2] * newSourcePoint[0] +
      this.weightsArrays[1][2] * newSourcePoint[1] +
      this.weightsArrays[2][2]
    const num1 =
      this.weightsArrays[0][0] * newSourcePoint[0] +
      this.weightsArrays[1][0] * newSourcePoint[1] +
      this.weightsArrays[2][0]
    const num2 =
      this.weightsArrays[0][1] * newSourcePoint[0] +
      this.weightsArrays[1][1] * newSourcePoint[1] +
      this.weightsArrays[2][1]
    const newDestinationPointPartDerY: Point = [
      (c * this.weightsArrays[1][0] - this.weightsArrays[1][2] * num1) / c ** 2,
      (c * this.weightsArrays[1][1] - this.weightsArrays[1][2] * num2) / c ** 2
    ]

    return newDestinationPointPartDerY
  }
}
