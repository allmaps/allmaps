import { Matrix, pseudoInverse } from 'ml-matrix'

import { newArrayMatrix } from '@allmaps/stdlib'

import { BaseLinearWeightsTransformation } from './BaseLinearWeightsTransformation.js'

import type { Point } from '@allmaps/types'

import type { HelmertMeasures } from '../shared/types.js'

/**
 * 2D Helmert transformation (= similarity transformation)
 *
 * This transformation is a composition of a translation, rotation and scaling. There is no shearing.
 *
 * For this transformations, the system of equations is solved for x and y jointly.
 */
export class Helmert extends BaseLinearWeightsTransformation {
  destinationPointsArrays: [number[], number[]]

  coefsArrayMatrices: [number[][], number[][]]

  weightsArray?: number[]
  weightsArrays?: [number[], number[]]

  constructor(sourcePoints: Point[], destinationPoints: Point[]) {
    super(sourcePoints, destinationPoints, 'helmert', 2)

    this.destinationPointsArrays = [
      this.destinationPoints.map((value) => value[0]),
      this.destinationPoints.map((value) => value[1])
    ]

    // Construct two 2Nx4 coefsArrayMatrices
    // 1 0 x0 -y0
    // 1 0 x1 -y1
    // ...
    // 0 1 y0 x0
    // 0 1 y1 x1
    // ...
    this.coefsArrayMatrices = [
      newArrayMatrix(this.pointCount, 4, 0),
      newArrayMatrix(this.pointCount, 4, 0)
    ]
    for (let i = 0; i < this.pointCount; i++) {
      this.coefsArrayMatrices[0][i][0] = 1
      this.coefsArrayMatrices[0][i][1] = 0
      this.coefsArrayMatrices[0][i][2] = this.sourcePoints[i][0]
      this.coefsArrayMatrices[0][i][3] = -this.sourcePoints[i][1]
      this.coefsArrayMatrices[1][i][0] = 0
      this.coefsArrayMatrices[1][i][1] = 1
      this.coefsArrayMatrices[1][i][2] = this.sourcePoints[i][1]
      this.coefsArrayMatrices[1][i][3] = this.sourcePoints[i][0]
    }
  }

  /**
   * Solve the x and y components jointly.
   *
   * This uses the 'Pseudo Inverse' to compute a 'best fit' (least squares) approximate solution
   * for the system of linear equations, which is (in general) over-defined and hence lacks an exact solution.
   * See https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse
   *
   * This will result weightsArray shared by both components: [t_x, t_y, m, n]
   */
  solve() {
    const coefsMatrix = new Matrix([
      ...this.coefsArrayMatrices[0],
      ...this.coefsArrayMatrices[1]
    ])
    const destinationPointsMatrix = Matrix.columnVector([
      ...this.destinationPointsArrays[0],
      ...this.destinationPointsArrays[1]
    ])

    const pseudoInverseCoefsMatrix = pseudoInverse(coefsMatrix)

    const weightsMatrix = pseudoInverseCoefsMatrix.mmul(destinationPointsMatrix)

    this.weightsArray = weightsMatrix.to1DArray()
    this.weightsArrays = [this.weightsArray, this.weightsArray]
  }

  getMeasures(): HelmertMeasures {
    if (!this.weightsArrays) {
      this.solve()
    }

    if (!this.weightsArray) {
      throw new Error('Helmert weights not computed')
    }

    const measures: Partial<HelmertMeasures> = {}

    measures.scale = Math.sqrt(
      this.weightsArray[2] ** 2 + this.weightsArray[3] ** 2
    )
    measures.rotation = Math.atan2(this.weightsArray[3], this.weightsArray[2])
    measures.translation = [this.weightsArray[0], this.weightsArray[1]]

    return measures as HelmertMeasures
  }

  evaluateFunction(newSourcePoint: Point): Point {
    if (!this.weightsArrays) {
      this.solve()
    }

    if (!this.weightsArray) {
      throw new Error('Helmert weights not computed')
    }

    const newDestinationPoint: Point = [
      this.weightsArray[0] +
        this.weightsArray[2] * newSourcePoint[0] -
        this.weightsArray[3] * newSourcePoint[1],
      this.weightsArray[1] +
        this.weightsArray[2] * newSourcePoint[1] +
        this.weightsArray[3] * newSourcePoint[0]
    ]
    // Alternatively, using derived helmert measures
    // this.translation[0] +
    //   this.scale * Math.cos(rotation) * newSourcePoint[0] -
    //   this.scale * Math.sin(rotation) * newSourcePoint[1],
    // this.translation[1] +
    //   this.scale * Math.cos(rotation) * newSourcePoint[1] +
    //   this.scale * Math.sin(rotation) * newSourcePoint[0]

    return newDestinationPoint
  }

  evaluatePartialDerivativeX(_newSourcePoint: Point): Point {
    if (!this.weightsArrays) {
      this.solve()
    }

    if (!this.weightsArray) {
      throw new Error('Helmert weights not computed')
    }

    const newDestinationPointPartDerX: Point = [
      this.weightsArray[2],
      this.weightsArray[3]
    ]

    return newDestinationPointPartDerX
  }

  evaluatePartialDerivativeY(_newSourcePoint: Point): Point {
    if (!this.weightsArrays) {
      this.solve()
    }

    if (!this.weightsArray) {
      throw new Error('Helmert weights not computed')
    }

    const newDestinationPointPartDerY: Point = [
      -this.weightsArray[3],
      this.weightsArray[2]
    ]

    return newDestinationPointPartDerY
  }
}
