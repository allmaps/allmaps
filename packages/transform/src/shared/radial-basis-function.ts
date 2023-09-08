import { Matrix, inverse } from 'ml-matrix'
import { multiplyMatricesElementwise } from './matrix.js'

import type { Transform } from './types'

import type { KernelFunction, NormFunction } from './types.js'

import type { Position } from '@allmaps/types'

export default class RBF implements Transform {
  sourcePositions: Position[]
  destinationPositions: Position[]

  kernelFunction: KernelFunction
  normFunction: NormFunction

  weightsMatrices: [Matrix, Matrix]

  nPositions: number
  epsilon?: number

  constructor(
    sourcePositions: Position[],
    destinationPositions: Position[],
    kernelFunction: KernelFunction,
    normFunction: NormFunction,
    epsilon?: number
  ) {
    this.sourcePositions = sourcePositions
    this.destinationPositions = destinationPositions

    this.kernelFunction = kernelFunction
    this.normFunction = normFunction

    this.nPositions = this.sourcePositions.length

    if (this.nPositions < 3) {
      throw new Error(
        `Not enough controle points. A thin plate spline transformation (with affine component) requires a minimum of 3 points, but ${this.nPositions} are given.`
      )
    }

    // 2D Radial Basis Function interpolation
    // See notebook https://observablehq.com/d/0b57d3b587542794 for code source and explanation

    // The system of equations is solved for x and y separately (because they are independant)
    // Hence destinationPositionsMatrices and weightsMatrices are an Array of two column vector matrices
    // Since they both use the same coefficients, there is only one kernelsAndAffineCoefsMatrix

    const destinationPositionsMatrices: [Matrix, Matrix] = [
      Matrix.columnVector(
        [...destinationPositions, [0, 0], [0, 0], [0, 0]].map(
          (value) => value[0]
        )
      ),
      Matrix.columnVector(
        [...destinationPositions, [0, 0], [0, 0], [0, 0]].map(
          (value) => value[1]
        )
      )
    ]

    // Pre-compute kernelsMatrix: fill it with the position to position distances between all controle positions
    const kernelsMatrix = Matrix.zeros(this.nPositions, this.nPositions)
    for (let i = 0; i < this.nPositions; i++) {
      for (let j = 0; j < this.nPositions; j++) {
        kernelsMatrix.set(
          i,
          j,
          normFunction(sourcePositions[i], sourcePositions[j])
        )
      }
    }

    // If it's not provided, and if it's an input to the kernelFunction, compute epsilon as the average distance between the controle positions
    if (epsilon === undefined) {
      epsilon =
        kernelsMatrix.sum() / (Math.pow(this.nPositions, 2) - this.nPositions)
    }

    this.epsilon = epsilon

    // Finish the computation of kernelsMatrix by applying the requested kernel function
    for (let i = 0; i < this.nPositions; i++) {
      for (let j = 0; j < this.nPositions; j++) {
        kernelsMatrix.set(
          i,
          j,
          kernelFunction(kernelsMatrix.get(i, j), epsilon)
        )
      }
    }

    // Extend kernelsMatrix to include the affine transformation
    const affineCoefsMatrix = Matrix.zeros(this.nPositions, 3)
    const kernelsAndAffineCoefsMatrix = Matrix.zeros(
      this.nPositions + 3,
      this.nPositions + 3
    )
    // Construct Nx3 Matrix affineCoefsMatrix
    // 1 x0 y0
    // 1 x1 y1
    // 1 x2 y2
    // ...
    for (let i = 0; i < this.nPositions; i++) {
      affineCoefsMatrix.set(i, 0, 1)
      affineCoefsMatrix.set(i, 1, sourcePositions[i][0])
      affineCoefsMatrix.set(i, 2, sourcePositions[i][1])
    }
    // Combine kernelsMatrix and affineCoefsMatrix into new matrix kernelsAndAffineCoefsMatrix
    // Note: mlMatrix has no knowledge of block matrices, but this approach is good enough
    // To speed this up, we could maybe use kernelsMatrix.addRow() and kernelsMatrix.addVector()
    for (let i = 0; i < this.nPositions + 3; i++) {
      for (let j = 0; j < this.nPositions + 3; j++) {
        if (i < this.nPositions && j < this.nPositions) {
          kernelsAndAffineCoefsMatrix.set(i, j, kernelsMatrix.get(i, j))
        } else if (i >= this.nPositions && j < this.nPositions) {
          kernelsAndAffineCoefsMatrix.set(
            i,
            j,
            affineCoefsMatrix.transpose().get(i - this.nPositions, j)
          )
        } else if (i < this.nPositions && j >= this.nPositions) {
          kernelsAndAffineCoefsMatrix.set(
            i,
            j,
            affineCoefsMatrix.get(i, j - this.nPositions)
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
      inverseKernelsAndAffineCoefsMatrix.mmul(destinationPositionsMatrices[0]),
      inverseKernelsAndAffineCoefsMatrix.mmul(destinationPositionsMatrices[1])
    ]
  }

  // The interpolant function will compute the value at any position.
  interpolant(newSourcePosition: Position): Position {
    if (!this.weightsMatrices) {
      throw new Error('Weights not computed')
    }

    // Make a column matrix with the distances of that position to all controle positions
    const newDistancesMatrix = Matrix.zeros(this.nPositions, 1)
    for (let i = 0; i < this.nPositions; i++) {
      newDistancesMatrix.set(
        i,
        0,
        this.kernelFunction(
          this.normFunction(newSourcePosition, this.sourcePositions[i]),
          this.epsilon
        )
      )
    }

    // Compute the interpolated value by summing the weighted contributions of the input position
    const newDestinationPosition: Position = [0, 0]
    for (let i = 0; i < 2; i++) {
      // Apply the weights to the new distances
      // Note: don't consider the last three weights who are there for the affine part
      newDestinationPosition[i] = multiplyMatricesElementwise(
        newDistancesMatrix,
        this.weightsMatrices[i].selection(
          [...Array(this.nPositions).keys()],
          [0]
        )
      ).sum()
      // Add the affine part
      const a0 = this.weightsMatrices[i].get(this.nPositions, 0)
      const ax = this.weightsMatrices[i].get(this.nPositions + 1, 0)
      const ay = this.weightsMatrices[i].get(this.nPositions + 2, 0)
      newDestinationPosition[i] +=
        a0 + ax * newSourcePosition[0] + ay * newSourcePosition[1]
    }
    return newDestinationPosition
  }
}
