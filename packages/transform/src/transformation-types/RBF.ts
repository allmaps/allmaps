import { Matrix, inverse } from 'ml-matrix'

import {
  arrayMatrixSize,
  newArrayMatrix,
  newBlockArrayMatrix,
  pasteArrayMatrix,
  transposeArrayMatrix
} from '@allmaps/stdlib'

import { Polynomial1 } from './Polynomial1.js'
import { BaseIndependentLinearWeightsTransformation } from './BaseIndependentLinearWeightsTransformation.js'

import type { KernelFunction, NormFunction } from '../shared/types.js'

import type { Point, Size } from '@allmaps/types'

/**
 * 2D Radial Basis Functions transformation
 *
 * See notebook https://observablehq.com/d/0b57d3b587542794 for code source and explanation
 */
export class RBF extends BaseIndependentLinearWeightsTransformation {
  kernelFunction: KernelFunction
  normFunction: NormFunction

  epsilon?: number

  coefsArrayMatrices: [number[][], number[][]]
  coefsArrayMatrix: number[][]
  coefsArrayMatricesSize: [Size, Size]
  coefsArrayMatrixSize: Size

  weightsArrays?: [number[], number[]]
  rbfWeightsArrays?: [number[], number[]]
  affineWeightsArrays?: [number[], number[]]

  constructor(
    sourcePoints: Point[],
    destinationPoints: Point[],
    kernelFunction: KernelFunction,
    normFunction: NormFunction,
    epsilon?: number
  ) {
    super(sourcePoints, destinationPoints, 'thinPlateSpline', 3)

    this.kernelFunction = kernelFunction
    this.normFunction = normFunction

    this.epsilon = epsilon

    // Note: getCoefsArrayMatrices can not be moved to the parent class's constructor
    // since for this class it uses properties (normFunction, kernelFunction, epsilon)
    // which are only defined after super()
    this.coefsArrayMatrices = this.getCoefsArrayMatrices()
    this.coefsArrayMatrix = this.coefsArrayMatrices[0]
    this.coefsArrayMatricesSize = this.coefsArrayMatrices.map(
      (coefsArrayMatrix) => arrayMatrixSize(coefsArrayMatrix)
    ) as [[number, number], [number, number]]
    this.coefsArrayMatrixSize = arrayMatrixSize(this.coefsArrayMatrix)
  }

  getDestinationPointsArrays(): [number[], number[]] {
    return [
      [...this.destinationPoints, [0, 0], [0, 0], [0, 0]].map(
        (value) => value[0]
      ),
      [...this.destinationPoints, [0, 0], [0, 0], [0, 0]].map(
        (value) => value[1]
      )
    ]
  }

  getCoefsArrayMatrix(): number[][] {
    // Pre-compute kernelsArrayMatrix: fill normsArrayMatrix
    // with the point to point distances between all control points
    const normsArrayMatrix = newArrayMatrix(this.pointCount, this.pointCount, 0)
    for (let i = 0; i < this.pointCount; i++) {
      for (let j = 0; j < this.pointCount; j++) {
        normsArrayMatrix[i][j] = this.normFunction(
          this.sourcePoints[i],
          this.sourcePoints[j]
        )
      }
    }

    // If it's not provided, and if it's an input to the kernelFunction,
    // compute epsilon as the average distance between the control points
    if (this.epsilon === undefined) {
      const normsSum = normsArrayMatrix
        .map((row) => row.reduce((a, c) => a + c, 0))
        .reduce((a, c) => a + c, 0)
      this.epsilon = normsSum / (Math.pow(this.pointCount, 2) - this.pointCount)
    }

    // Finish the computation of kernelsArrayMatrix by applying the requested kernel function
    const kernelCoefsArrayMatrix = newArrayMatrix(
      this.pointCount,
      this.pointCount,
      0
    )
    for (let i = 0; i < this.pointCount; i++) {
      for (let j = 0; j < this.pointCount; j++) {
        kernelCoefsArrayMatrix[i][j] = this.kernelFunction(
          normsArrayMatrix[i][j],
          {
            epsilon: this.epsilon
          }
        )
      }
    }

    // Construct Nx3 affineCoefsArrayMatrix
    // 1 x0 y0
    // 1 x1 y1
    // 1 x2 y2
    // ...
    let affineCoefsArrayMatrix = newArrayMatrix(this.pointCount, 3, 0)
    for (let i = 0; i < this.pointCount; i++) {
      affineCoefsArrayMatrix = pasteArrayMatrix(affineCoefsArrayMatrix, i, 0, [
        Polynomial1.getPolynomial1SourcePointCoefsArray(this.sourcePoints[i])
      ])
    }

    // Construct 3x3 zerosArrayMatrix
    const zerosArrayMatrix = newArrayMatrix(3, 3, 0)

    // Combine kernelsArrayMatrix and affineCoefsArrayMatrix
    // into new coefsArrayMatrix, to include the affine transformation
    const coefsArrayMatrix = newBlockArrayMatrix([
      [kernelCoefsArrayMatrix, affineCoefsArrayMatrix],
      [transposeArrayMatrix(affineCoefsArrayMatrix), zerosArrayMatrix]
    ])

    return coefsArrayMatrix
  }

  /**
   * Get 1x(N+3) coefsArray, populating the (N+3)x(N+3) coefsArrayMatrix
   *
   * The coefsArray has a 1xN kernel part and a 1x3 affine part.
   *
   * @param sourcePoint
   */
  getSourcePointCoefsArray(sourcePoint: Point): number[] {
    return [
      ...this.getRbfKernelSourcePointCoefsArray(sourcePoint),
      ...Polynomial1.getPolynomial1SourcePointCoefsArray(sourcePoint)
    ]
  }

  getRbfKernelSourcePointCoefsArray(sourcePoint: Point): number[] {
    const kernelSourcePointCoefsArray: number[] = []

    for (let i = 0; i < this.pointCount; i++) {
      kernelSourcePointCoefsArray.push(
        this.kernelFunction(
          this.normFunction(this.sourcePoints[i], sourcePoint),
          {
            epsilon: this.epsilon
          }
        )
      )
    }

    return kernelSourcePointCoefsArray
  }

  setWeightsArrays(weightsArrays: object, epsilon?: number): void {
    if (epsilon) {
      this.epsilon = epsilon
    }
    super.setWeightsArrays(weightsArrays)
  }

  /**
   * Solve the x and y components independently.
   *
   * This uses the exact inverse to compute (for each component, using the same coefs for both)
   * the exact solution for the system of linear equations
   * which is (in general) invertable to an exact solution.
   *
   * This wil result in a weights array for each component with rbf weights and affine weights.
   */
  solve() {
    const coefsMatrix = new Matrix(this.coefsArrayMatrix)
    const destinationPointsMatrices = [
      Matrix.columnVector(this.destinationPointsArrays[0]),
      Matrix.columnVector(this.destinationPointsArrays[1])
    ]

    const inverseCoefsMatrix = inverse(coefsMatrix)

    const weightsMatrices = [
      inverseCoefsMatrix.mmul(destinationPointsMatrices[0]),
      inverseCoefsMatrix.mmul(destinationPointsMatrices[1])
    ] as [Matrix, Matrix]

    this.weightsArrays = weightsMatrices.map((matrix) =>
      matrix.to1DArray()
    ) as [number[], number[]]

    this.processWeightsArrays()
  }

  processWeightsArrays() {
    if (!this.weightsArrays) {
      throw new Error('Weights not computed')
    }

    this.rbfWeightsArrays = this.weightsArrays.map((array) =>
      array.slice(0, this.pointCount)
    ) as [number[], number[]]
    this.affineWeightsArrays = this.weightsArrays.map((array) =>
      array.slice(this.pointCount)
    ) as [number[], number[]]
  }

  evaluateFunction(newSourcePoint: Point): Point {
    if (!this.weightsArrays) {
      this.solve()
    }

    if (!this.rbfWeightsArrays || !this.affineWeightsArrays) {
      throw new Error('RBF weights not computed')
    }

    const rbfWeights = this.rbfWeightsArrays
    const affineWeights = this.affineWeightsArrays

    // Compute the distances of that point to all control points
    const newDistances = this.sourcePoints.map((sourcePoint) =>
      this.normFunction(newSourcePoint, sourcePoint)
    )

    // Sum the weighted contributions of the input point
    const newDestinationPoint: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      // Apply the weights to the new distances
      newDestinationPoint[i] = newDistances.reduce(
        (sum, dist, index) =>
          sum +
          this.kernelFunction(dist, { epsilon: this.epsilon }) *
            rbfWeights[i][index],
        0
      )
      // Add the affine part
      newDestinationPoint[i] +=
        affineWeights[i][0] +
        affineWeights[i][1] * newSourcePoint[0] +
        affineWeights[i][2] * newSourcePoint[1]
    }
    return newDestinationPoint
  }

  evaluatePartialDerivativeX(newSourcePoint: Point): Point {
    if (!this.weightsArrays) {
      this.solve()
    }

    if (!this.rbfWeightsArrays || !this.affineWeightsArrays) {
      throw new Error('RBF weights not computed')
    }

    const rbfWeights = this.rbfWeightsArrays
    const affineWeights = this.affineWeightsArrays

    // Compute the distances of that point to all control points
    const newDistances = this.sourcePoints.map((sourcePoint) =>
      this.normFunction(newSourcePoint, sourcePoint)
    )

    // Sum the weighted contributions of the input point
    const newDestinationPointPartDerX: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      // Apply the weights to the new distances
      newDestinationPointPartDerX[i] = newDistances.reduce(
        (sum, dist, index) =>
          sum +
          (dist === 0
            ? 0
            : this.kernelFunction(dist, {
                derivative: 1,
                epsilon: this.epsilon
              }) *
              ((newSourcePoint[0] - this.sourcePoints[index][0]) / dist) *
              rbfWeights[i][index]),
        0
      )
      // Add the affine part
      newDestinationPointPartDerX[i] += affineWeights[i][1]
    }
    return newDestinationPointPartDerX
  }

  evaluatePartialDerivativeY(newSourcePoint: Point): Point {
    if (!this.weightsArrays) {
      this.solve()
    }

    if (!this.rbfWeightsArrays || !this.affineWeightsArrays) {
      throw new Error('RBF weights not computed')
    }

    const rbfWeights = this.rbfWeightsArrays
    const affineWeights = this.affineWeightsArrays

    // Compute the distances of that point to all control points
    const newDistances = this.sourcePoints.map((sourcePoint) =>
      this.normFunction(newSourcePoint, sourcePoint)
    )

    // Sum the weighted contributions of the input point
    const newDestinationPointPartDerY: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      // Apply the weights to the new distances
      newDestinationPointPartDerY[i] = newDistances.reduce(
        (sum, dist, index) =>
          sum +
          (dist === 0
            ? 0
            : this.kernelFunction(dist, {
                derivative: 1,
                epsilon: this.epsilon
              }) *
              ((newSourcePoint[1] - this.sourcePoints[index][1]) / dist) *
              rbfWeights[i][index]),
        0
      )
      // Add the affine part
      newDestinationPointPartDerY[i] += affineWeights[i][2]
    }
    return newDestinationPointPartDerY
  }
}
