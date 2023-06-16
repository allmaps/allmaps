import { Matrix, solve } from 'ml-matrix'

import type { DistanceFunction, NormFunction, Position } from './types.js'

// Elementwise product of two matrices, also called Hadamard product or Shur product
// This function is not provided as part of mlMatrix
// This is different from a classical matrix product availble in numeric as M1.mul(M2)
function mulitplyMatricesElementwise(M1: Matrix, M2: Matrix): Matrix {
  M1 = Matrix.checkMatrix(M1)
  M2 = Matrix.checkMatrix(M2)
  if (M1.rows != M2.rows || M1.columns != M2.columns)
    throw new Error('Matrices have different dimensions')
  const M = Matrix.zeros(M1.rows, M1.columns)
  for (let i = 0; i < M1.rows; i++) {
    for (let j = 0; j < M1.columns; j++) {
      M.set(i, j, M1.get(i, j) * M2.get(i, j))
    }
  }
  return M
}

// See notebook https://observablehq.com/d/0b57d3b587542794 for code source and explanation
export default class RBF {
  sourcePoints: Position[]
  destinationPoints: Position[]

  distanceFunction: DistanceFunction
  normFunction: NormFunction

  weightsMatrices?: [Matrix, Matrix]

  epsilon?: number
  dimension: number

  constructor(
    sourcePoints: Position[],
    destinationPoints: Position[],
    distanceFunction: DistanceFunction,
    normFunction: NormFunction,
    epsilon?: number
  ) {
    // Notes on types:
    //
    // 'sourcePoints' and 'destinationPoints' are Arrays
    // sourcePoints = [[x0, y0], [x1, y1], ...]
    // destinationPoints = [[x'0, y0], [x'1, y'1], ...]
    //
    // 'destinationPointsMatrices' and 'weightsMatrices' is an Array of Matrices
    // destinationPointsMatrices = [Matrix([[x'0], [x'1], ...]), Matrix([[y'0], [y'1], ...])]
    // destinationPointsMatrices[i] is a Matrix of (dimension, 1)

    this.sourcePoints = sourcePoints
    this.destinationPoints = destinationPoints

    this.distanceFunction = distanceFunction
    this.normFunction = normFunction

    this.dimension = this.sourcePoints.length

    const destinationPointsMatrices: [Matrix, Matrix] = [
      Matrix.columnVector(
        [...destinationPoints, [0, 0], [0, 0], [0, 0]].map((value) => value[0])
      ),
      Matrix.columnVector(
        [...destinationPoints, [0, 0], [0, 0], [0, 0]].map((value) => value[1])
      )
    ]

    // Compute distancesMatrix, containing the point to point distances between all controle points
    const distancesMatrix = Matrix.zeros(this.dimension, this.dimension)
    for (let i = 0; i < this.dimension; i++) {
      for (let j = 0; j < this.dimension; j++) {
        distancesMatrix.set(
          i,
          j,
          normFunction(sourcePoints[i], sourcePoints[j])
        )
      }
    }

    // If it's not provided, compute espilon as the average distance between the controle points
    if (epsilon === undefined) {
      epsilon =
        distancesMatrix.sum() / (Math.pow(this.dimension, 2) - this.dimension)
    }

    this.epsilon = epsilon

    // Update the matrix to reflect the requested distance function
    // Note: for distance functions which do not take an epsilon value this step does not alter the matrix. In production this can be skipped for such distance functions.
    for (let i = 0; i < this.dimension; i++) {
      for (let j = 0; j < this.dimension; j++) {
        distancesMatrix.set(
          i,
          j,
          distanceFunction(distancesMatrix.get(i, j), epsilon)
        )
      }
    }

    // Extend the point distance matrix to include the affine transformation
    const affineCoefsMatrix = Matrix.zeros(this.dimension, 3)
    const distancesAndAffineCoefsMatrix = Matrix.zeros(
      this.dimension + 3,
      this.dimension + 3
    )
    // Construct Nx3 Matrix affineCoefsMatrix
    // 1 x0 y0
    // 1 x1 y1
    // 1 x2 y2
    // ...
    for (let i = 0; i < this.dimension; i++) {
      affineCoefsMatrix.set(i, 0, 1)
      affineCoefsMatrix.set(i, 1, sourcePoints[i][0])
      affineCoefsMatrix.set(i, 2, sourcePoints[i][1])
    }
    // Combine distancesMatrix and affineCoefsMatrix into new matrix distancesAndAffineCoefsMatrix
    // Note: mlMatrix has no knowledge of block matrices, but this approach is good enough
    // To speed this up, we could maybe use distancesMatrix.addRow() and distancesMatrix.addVector()
    for (let i = 0; i < this.dimension + 3; i++) {
      for (let j = 0; j < this.dimension + 3; j++) {
        if (i < this.dimension && j < this.dimension) {
          distancesAndAffineCoefsMatrix.set(i, j, distancesMatrix.get(i, j))
        } else if (i >= this.dimension && j < this.dimension) {
          distancesAndAffineCoefsMatrix.set(
            i,
            j,
            affineCoefsMatrix.transpose().get(i - this.dimension, j)
          )
        } else if (i < this.dimension && j >= this.dimension) {
          distancesAndAffineCoefsMatrix.set(
            i,
            j,
            affineCoefsMatrix.get(i, j - this.dimension)
          )
        }
      }
    }

    // Compute basis functions weights by solving the linear system of equations for each target component
    // Note: for this example the system is solved with and without the affine part to allow comparing between both situation. This is, of course, not efficient in production, where it's best to make a choice.
    this.weightsMatrices = [
      solve(distancesAndAffineCoefsMatrix, destinationPointsMatrices[0]),
      solve(distancesAndAffineCoefsMatrix, destinationPointsMatrices[1])
    ]
  }

  // The interpolant function will compute the value at any point.
  interpolant(newSourcePoint: Position): Position {
    if (!this.weightsMatrices) {
      throw new Error('Weights not computed')
    }

    // First make a column matrix with the distances of that point to all controle points
    const newDistancesMatrix = Matrix.zeros(this.dimension, 1)
    for (let i = 0; i < this.dimension; i++) {
      newDistancesMatrix.set(
        i,
        0,
        this.distanceFunction(
          this.normFunction(newSourcePoint, this.sourcePoints[i]),
          this.epsilon
        )
      )
    }

    // Then it computes the interpolated value by summing the weighted contributions of the input points
    const newDestinationPoint: Position = [0, 0]
    for (let i = 0; i < 2; i++) {
      // Apply the weights to the new distances
      // Note: don't consider the last three weights who are there for the affine part
      newDestinationPoint[i] = mulitplyMatricesElementwise(
        newDistancesMatrix,
        this.weightsMatrices[i].selection(
          [...Array(this.dimension).keys()],
          [0]
        )
      ).sum()
      // Add the affine part
      const a0 = this.weightsMatrices[i].get(this.dimension, 0)
      const ax = this.weightsMatrices[i].get(this.dimension + 1, 0)
      const ay = this.weightsMatrices[i].get(this.dimension + 2, 0)
      newDestinationPoint[i] +=
        a0 + ax * newSourcePoint[0] + ay * newSourcePoint[1]
    }
    return newDestinationPoint
  }
}
