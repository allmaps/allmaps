import { Matrix, inverse } from 'ml-matrix'
import { multiplyMatricesElementwise } from './matrix.js'

import type { KernelFunction, NormFunction, Position } from './types.js'

export default class RBF {
  sourcePoints: Position[]
  destinationPoints: Position[]

  kernelFunction: KernelFunction
  normFunction: NormFunction

  weightsMatrices: [Matrix, Matrix]

  nPoints: number
  epsilon?: number

  constructor(
    sourcePoints: Position[],
    destinationPoints: Position[],
    kernelFunction: KernelFunction,
    normFunction: NormFunction,
    epsilon?: number
  ) {
    this.sourcePoints = sourcePoints
    this.destinationPoints = destinationPoints

    this.kernelFunction = kernelFunction
    this.normFunction = normFunction

    this.nPoints = this.sourcePoints.length

    if (this.nPoints < 3) {
      throw new Error(
        'Not enough controle points. A Thin-Plate-Spline transformation (with affine component) requires a minimum of 3 points, but ' +
          this.nPoints +
          ' are given.'
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

    // Pre-compute kernelsMatrix: fill it with the point to point distances between all controle points
    const kernelsMatrix = Matrix.zeros(this.nPoints, this.nPoints)
    for (let i = 0; i < this.nPoints; i++) {
      for (let j = 0; j < this.nPoints; j++) {
        kernelsMatrix.set(i, j, normFunction(sourcePoints[i], sourcePoints[j]))
      }
    }

    // If it's not provided, and if it's an input to the kernelFunction, compute epsilon as the average distance between the controle points
    if (epsilon === undefined) {
      epsilon = kernelsMatrix.sum() / (Math.pow(this.nPoints, 2) - this.nPoints)
    }

    this.epsilon = epsilon

    // Finish the computation of kernelsMatrix by applying the requested kernel function
    for (let i = 0; i < this.nPoints; i++) {
      for (let j = 0; j < this.nPoints; j++) {
        kernelsMatrix.set(
          i,
          j,
          kernelFunction(kernelsMatrix.get(i, j), epsilon)
        )
      }
    }

    // Extend kernelsMatrix to include the affine transformation
    const affineCoefsMatrix = Matrix.zeros(this.nPoints, 3)
    const kernelsAndAffineCoefsMatrix = Matrix.zeros(
      this.nPoints + 3,
      this.nPoints + 3
    )
    // Construct Nx3 Matrix affineCoefsMatrix
    // 1 x0 y0
    // 1 x1 y1
    // 1 x2 y2
    // ...
    for (let i = 0; i < this.nPoints; i++) {
      affineCoefsMatrix.set(i, 0, 1)
      affineCoefsMatrix.set(i, 1, sourcePoints[i][0])
      affineCoefsMatrix.set(i, 2, sourcePoints[i][1])
    }
    // Combine kernelsMatrix and affineCoefsMatrix into new matrix kernelsAndAffineCoefsMatrix
    // Note: mlMatrix has no knowledge of block matrices, but this approach is good enough
    // To speed this up, we could maybe use kernelsMatrix.addRow() and kernelsMatrix.addVector()
    for (let i = 0; i < this.nPoints + 3; i++) {
      for (let j = 0; j < this.nPoints + 3; j++) {
        if (i < this.nPoints && j < this.nPoints) {
          kernelsAndAffineCoefsMatrix.set(i, j, kernelsMatrix.get(i, j))
        } else if (i >= this.nPoints && j < this.nPoints) {
          kernelsAndAffineCoefsMatrix.set(
            i,
            j,
            affineCoefsMatrix.transpose().get(i - this.nPoints, j)
          )
        } else if (i < this.nPoints && j >= this.nPoints) {
          kernelsAndAffineCoefsMatrix.set(
            i,
            j,
            affineCoefsMatrix.get(i, j - this.nPoints)
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
  }

  // The interpolant function will compute the value at any point.
  interpolant(newSourcePoint: Position): Position {
    if (!this.weightsMatrices) {
      throw new Error('Weights not computed')
    }

    // Make a column matrix with the distances of that point to all controle points
    const newDistancesMatrix = Matrix.zeros(this.nPoints, 1)
    for (let i = 0; i < this.nPoints; i++) {
      newDistancesMatrix.set(
        i,
        0,
        this.kernelFunction(
          this.normFunction(newSourcePoint, this.sourcePoints[i]),
          this.epsilon
        )
      )
    }

    // Compute the interpolated value by summing the weighted contributions of the input point
    const newDestinationPoint: Position = [0, 0]
    for (let i = 0; i < 2; i++) {
      // Apply the weights to the new distances
      // Note: don't consider the last three weights who are there for the affine part
      newDestinationPoint[i] = multiplyMatricesElementwise(
        newDistancesMatrix,
        this.weightsMatrices[i].selection([...Array(this.nPoints).keys()], [0])
      ).sum()
      // Add the affine part
      const a0 = this.weightsMatrices[i].get(this.nPoints, 0)
      const ax = this.weightsMatrices[i].get(this.nPoints + 1, 0)
      const ay = this.weightsMatrices[i].get(this.nPoints + 2, 0)
      newDestinationPoint[i] +=
        a0 + ax * newSourcePoint[0] + ay * newSourcePoint[1]
    }
    return newDestinationPoint
  }
}
