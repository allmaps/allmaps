import { Matrix, inverse } from 'ml-matrix'

import {
  newArrayMatrix,
  newBlockArrayMatrix,
  transposeArrayMatrix
} from '@allmaps/stdlib'

import { BaseLinearWeightsTransformation } from './BaseLinearWeightsTransformation.js'

import type { KernelFunction, NormFunction } from '../shared/types.js'

import type { Point } from '@allmaps/types'

/**
 * 2D Radial Basis Functions transformation
 *
 * For this transformations, the system of equations is solved for x and y separately.
 *
 * See notebook https://observablehq.com/d/0b57d3b587542794 for code source and explanation
 */
export class RBF extends BaseLinearWeightsTransformation {
  destinationPointsArrays: [number[], number[]]

  kernelFunction: KernelFunction
  normFunction: NormFunction

  epsilon?: number

  coefsArrayMatrices: [number[][], number[][]]

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

    this.destinationPointsArrays = [
      [...this.destinationPoints, [0, 0], [0, 0], [0, 0]].map(
        (value) => value[0]
      ),
      [...this.destinationPoints, [0, 0], [0, 0], [0, 0]].map(
        (value) => value[1]
      )
    ]

    // Pre-compute kernelsArrayArray: fill normsArrayArray
    // with the point to point distances between all control points
    const normsArrayArray = newArrayMatrix(this.pointCount, this.pointCount, 0)
    for (let i = 0; i < this.pointCount; i++) {
      for (let j = 0; j < this.pointCount; j++) {
        normsArrayArray[i][j] = this.normFunction(
          this.sourcePoints[i],
          this.sourcePoints[j]
        )
      }
    }

    // If it's not provided, and if it's an input to the kernelFunction,
    // compute epsilon as the average distance between the control points
    if (this.epsilon === undefined) {
      const normsSum = normsArrayArray
        .map((row) => row.reduce((a, c) => a + c, 0))
        .reduce((a, c) => a + c, 0)
      this.epsilon = normsSum / (Math.pow(this.pointCount, 2) - this.pointCount)
    }

    // Finish the computation of kernelsArrayArray by applying the requested kernel function
    const kernelCoefsArrayArray = newArrayMatrix(
      this.pointCount,
      this.pointCount,
      0
    )
    for (let i = 0; i < this.pointCount; i++) {
      for (let j = 0; j < this.pointCount; j++) {
        kernelCoefsArrayArray[i][j] = this.kernelFunction(
          normsArrayArray[i][j],
          {
            epsilon: this.epsilon
          }
        )
      }
    }

    // Construct Nx3 affineCoefsArrayArray
    // 1 x0 y0
    // 1 x1 y1
    // 1 x2 y2
    // ...
    const affineCoefsArrayArray = newArrayMatrix(this.pointCount, 3, 0)
    for (let i = 0; i < this.pointCount; i++) {
      affineCoefsArrayArray[i][0] = 1
      affineCoefsArrayArray[i][1] = this.sourcePoints[i][0]
      affineCoefsArrayArray[i][2] = this.sourcePoints[i][1]
    }

    // Construct 3x3 zerosArrayArray
    const zerosArrayArray = newArrayMatrix(3, 3, 0)

    // Combine kernelsArrayArray and affineCoefsArrayArray
    // into new coefsArrayArray, to include the affine transformation
    const coefsArrayArray = newBlockArrayMatrix([
      [kernelCoefsArrayArray, affineCoefsArrayArray],
      [transposeArrayMatrix(affineCoefsArrayArray), zerosArrayArray]
    ])

    this.coefsArrayMatrices = [coefsArrayArray, coefsArrayArray]
  }

  /**
   * Solve the x and y components separately.
   *
   * This uses the exact inverse to compute (for each component, using the same coefs for both)
   * the exact solution for the system of linear equations
   * which is (in general) invertable to an exact solution.
   *
   * This wil result in a weights array for each component with rbf weights and affine weights.
   */
  solve() {
    const coefsMatrix = new Matrix(this.coefsArrayMatrices[0])
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
