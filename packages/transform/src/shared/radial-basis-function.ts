import { Matrix, inverse } from 'ml-matrix'

import type { Transformation } from './types'

import type { KernelFunction, NormFunction } from './types.js'

import type { Point } from '@allmaps/types'

export default class RBF implements Transformation {
  sourcePoints: Point[]
  destinationPoints: Point[]

  kernelFunction: KernelFunction
  normFunction: NormFunction

  weightsMatrices: [Matrix, Matrix]
  rbfWeights: [number[], number[]]
  affineWeights: [number[], number[]]

  pointCount: number
  epsilon?: number

  constructor(
    sourcePoints: Point[],
    destinationPoints: Point[],
    kernelFunction: KernelFunction,
    normFunction: NormFunction,
    epsilon?: number
  ) {
    this.sourcePoints = sourcePoints
    this.destinationPoints = destinationPoints

    this.kernelFunction = kernelFunction
    this.normFunction = normFunction

    this.pointCount = this.sourcePoints.length

    if (this.pointCount < 3) {
      throw new Error(
        `Not enough control points. A thin plate spline transformation (with affine component) requires a minimum of 3 points, but ${this.pointCount} are given.`
      )
    }

    // 2D Radial Basis Function interpolation
    // See notebook https://observablehq.com/d/0b57d3b587542794 for code source and explanation

    // The system of equations is solved for x and y separately (because they are independant)
    // Hence destinationPointsMatrices and weightsMatrices are an Array of two column vector matrices
    // Since they both use the same coefficients, there is only one kernelsAndAffineCoefsMatrix

    const destinationPointsMatrices: [Matrix, Matrix] = [
      Matrix.columnVector(
        [...destinationPoints, [0, 0], [0, 0], [0, 0]].map((value) => value[0])
      ),
      Matrix.columnVector(
        [...destinationPoints, [0, 0], [0, 0], [0, 0]].map((value) => value[1])
      )
    ]

    // Pre-compute kernelsMatrix: fill it with the point to point distances between all control points
    const kernelsMatrix = Matrix.zeros(this.pointCount, this.pointCount)
    for (let i = 0; i < this.pointCount; i++) {
      for (let j = 0; j < this.pointCount; j++) {
        kernelsMatrix.set(i, j, normFunction(sourcePoints[i], sourcePoints[j]))
      }
    }

    // If it's not provided, and if it's an input to the kernelFunction,
    // compute epsilon as the average distance between the control points
    if (epsilon === undefined) {
      epsilon =
        kernelsMatrix.sum() / (Math.pow(this.pointCount, 2) - this.pointCount)
    }

    this.epsilon = epsilon

    // Finish the computation of kernelsMatrix by applying the requested kernel function
    for (let i = 0; i < this.pointCount; i++) {
      for (let j = 0; j < this.pointCount; j++) {
        kernelsMatrix.set(
          i,
          j,
          kernelFunction(kernelsMatrix.get(i, j), epsilon)
        )
      }
    }

    // Extend kernelsMatrix to include the affine transformation
    const affineCoefsMatrix = Matrix.zeros(this.pointCount, 3)
    const kernelsAndAffineCoefsMatrix = Matrix.zeros(
      this.pointCount + 3,
      this.pointCount + 3
    )
    // Construct Nx3 Matrix affineCoefsMatrix
    // 1 x0 y0
    // 1 x1 y1
    // 1 x2 y2
    // ...
    for (let i = 0; i < this.pointCount; i++) {
      affineCoefsMatrix.set(i, 0, 1)
      affineCoefsMatrix.set(i, 1, sourcePoints[i][0])
      affineCoefsMatrix.set(i, 2, sourcePoints[i][1])
    }
    // Combine kernelsMatrix and affineCoefsMatrix into new matrix kernelsAndAffineCoefsMatrix
    // Note: mlMatrix has no knowledge of block matrices, but this approach is good enough
    // To speed this up, we could maybe use kernelsMatrix.addRow() and kernelsMatrix.addVector()
    for (let i = 0; i < this.pointCount + 3; i++) {
      for (let j = 0; j < this.pointCount + 3; j++) {
        if (i < this.pointCount && j < this.pointCount) {
          kernelsAndAffineCoefsMatrix.set(i, j, kernelsMatrix.get(i, j))
        } else if (i >= this.pointCount && j < this.pointCount) {
          kernelsAndAffineCoefsMatrix.set(
            i,
            j,
            affineCoefsMatrix.transpose().get(i - this.pointCount, j)
          )
        } else if (i < this.pointCount && j >= this.pointCount) {
          kernelsAndAffineCoefsMatrix.set(
            i,
            j,
            affineCoefsMatrix.get(i, j - this.pointCount)
          )
        }
      }
    }

    // Compute basis functions weights and the affine parameters by solving the linear system of equations for each target component
    // Note: the same kernelsAndAffineCoefsMatrix is used for both solutions
    const inverseKernelsAndAffineCoefsMatrix = inverse(
      kernelsAndAffineCoefsMatrix
    )
    this.weightsMatrices = [
      inverseKernelsAndAffineCoefsMatrix.mmul(destinationPointsMatrices[0]),
      inverseKernelsAndAffineCoefsMatrix.mmul(destinationPointsMatrices[1])
    ]

    // Store rbf and affine parts of the weights more as arrays for more efficient access on interpolation
    this.rbfWeights = this.weightsMatrices.map((matrix) =>
      matrix.selection([...Array(this.pointCount).keys()], [0]).to1DArray()
    ) as [number[], number[]]
    this.affineWeights = this.weightsMatrices.map((matrix) =>
      matrix
        .selection(
          [0, 1, 2].map((n) => n + this.pointCount),
          [0]
        )
        .to1DArray()
    ) as [number[], number[]]
  }

  // The interpolant function will compute the value at any point.
  interpolate(newSourcePoint: Point): Point {
    if (!this.rbfWeights || !this.affineWeights) {
      throw new Error('Weights not computed')
    }

    // Make a column matrix with the distances of that point to all control points
    const newDistances = this.sourcePoints.map((sourcePoint) =>
      this.kernelFunction(
        this.normFunction(newSourcePoint, sourcePoint),
        this.epsilon
      )
    )

    // Compute the interpolated value by summing the weighted contributions of the input point
    const newDestinationPoint: Point = [0, 0]
    for (let i = 0; i < 2; i++) {
      // Apply the weights to the new distances
      newDestinationPoint[i] = newDistances.reduce(
        (r0, e0, i0) => r0 + e0 * this.rbfWeights[i][i0],
        0
      )
      // Add the affine part
      newDestinationPoint[i] +=
        this.affineWeights[i][0] +
        this.affineWeights[i][1] * newSourcePoint[0] +
        this.affineWeights[i][2] * newSourcePoint[1]
    }
    return newDestinationPoint
  }
}
