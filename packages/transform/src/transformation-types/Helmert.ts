import { Matrix, pseudoInverse } from 'ml-matrix'

import {
  newArrayMatrix,
  pasteArrayMatrix,
  arrayMatrixDimensions
} from '@allmaps/stdlib'

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
  coefsArrayMatrices: [number[][], number[][]]
  coefsArrayMatricesDimensions: [[number, number], [number, number]]

  weightsArray?: number[]
  weightsArrays?: [number[], number[]]

  constructor(sourcePoints: Point[], destinationPoints: Point[]) {
    super(sourcePoints, destinationPoints, 'helmert', 2)

    this.coefsArrayMatrices = this.getCoefsArrayMatrices()
    this.coefsArrayMatricesDimensions = this.coefsArrayMatrices.map(
      (coefsArrayMatrix) => arrayMatrixDimensions(coefsArrayMatrix)
    ) as [[number, number], [number, number]]
  }

  getDestinationPointsArrays(): [number[], number[]] {
    return [
      this.destinationPoints.map((value) => value[0]),
      this.destinationPoints.map((value) => value[1])
    ]
  }

  getCoefsArrayMatrices(): [number[][], number[][]] {
    let coefsArrayMatrix0 = newArrayMatrix(this.pointCount, 4, 0)
    let coefsArrayMatrix1 = newArrayMatrix(this.pointCount, 4, 0)
    for (let i = 0; i < this.pointCount; i++) {
      const sourcePointCoefsArrays = this.getSourcePointCoefsArrays(
        this.sourcePoints[i]
      )
      coefsArrayMatrix0 = pasteArrayMatrix(coefsArrayMatrix0, i, 0, [
        sourcePointCoefsArrays[0]
      ])
      coefsArrayMatrix1 = pasteArrayMatrix(coefsArrayMatrix1, i, 0, [
        sourcePointCoefsArrays[1]
      ])
    }

    return [coefsArrayMatrix0, coefsArrayMatrix1]
  }

  /**
   * Get two 1x4 coefsArrays, populating the 2Nx4 coefsArrayMatrices
   * 1 0 x0 -y0
   * 1 0 x1 -y1
   * ...
   * 0 1 y0 x0
   * 0 1 y1 x1
   * ...
   *
   * @param sourcePoint
   */
  getSourcePointCoefsArrays(sourcePoint: Point): [number[], number[]] {
    return [
      [1, 0, sourcePoint[0], -sourcePoint[1]],
      [0, 1, sourcePoint[1], sourcePoint[0]]
    ]
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
