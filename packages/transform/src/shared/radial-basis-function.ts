import { Matrix, solve } from 'ml-matrix'

import type { DistanceFunction, NormFunction, Position } from './types.js'

function sumMatrix(matrix: Matrix): number {
  let sum = 0

  for (let j = 0; j < matrix.rows; j++) {
    for (let i = 0; i < matrix.columns; i++) {
      sum += matrix.get(j, i)
    }
  }

  return sum
}

function mulitplyMatricesValues(matrix1: Matrix, matrix2: Matrix): Matrix {
  let mul = Matrix.zeros(matrix1.rows, matrix1.columns)

  for (let j = 0; j < matrix1.rows; j++) {
    for (let i = 0; i < matrix1.columns; i++) {
      mul.set(j, i, matrix1.get(j, i) * matrix2.get(j, i))
    }
  }

  return mul
}

/**
 * This is essentially the rbf module by Thibaut Séguy, but modified to use a selectable norm
 * See https://github.com/thibauts/rbf
 **/
export default class RBF {
  points: Position[]
  values: Position[]

  distanceFunction: DistanceFunction
  normFunction: NormFunction

  epsilon: number

  weights?: [Matrix, Matrix]

  constructor(
    points: Position[],
    values: Position[],
    distanceFunction: DistanceFunction,
    normFunction: NormFunction,
    epsilon?: number
  ) {
    this.points = points
    this.values = values

    this.distanceFunction = distanceFunction
    this.normFunction = normFunction

    // `identity` here serves as a shorthand to allocate
    // the matrix nested array.
    const M = Matrix.eye(this.points.length)

    // First compute the point to point distance matrix
    // to allow computing epsilon if it's not provided
    for (let j = 0; j < this.points.length; j++) {
      for (let i = 0; i < this.points.length; i++) {
        M.set(j, i, normFunction(this.points[i], this.points[j]))
      }
    }

    // if needed, compute espilon as the average distance between points
    if (epsilon === undefined) {
      epsilon =
        sumMatrix(M) / (Math.pow(this.points.length, 2) - this.points.length)
    }

    this.epsilon = epsilon

    // update the matrix to reflect the requested distance function
    for (let j = 0; j < this.points.length; j++) {
      for (let i = 0; i < this.points.length; i++) {
        M.set(j, i, distanceFunction(M.get(j, i), this.epsilon))
      }
    }

    // reshape values by dimension/component
    let valuesByDimension = new Array(2)
    for (let i = 0; i < 2; i++) {
      valuesByDimension[i] = this.values.map((value) => value[i])
    }

    // Compute basis functions weights by solving
    // the linear system of equations for each target component
    // let this.weights: [Matrix, Matrix]
    this.weights = [
      solve(M, Matrix.columnVector(valuesByDimension[0])),
      solve(M, Matrix.columnVector(valuesByDimension[1]))
    ]
  }

  // The returned interpolant will compute the value at any point
  // by summing the weighted contributions of the input points
  interpolant(point: Position): Position {
    if (!this.weights) {
      throw new Error('Weights not computed')
    }

    let distances = new Array(this.points.length)
    for (let i = 0; i < this.points.length; i++) {
      distances[i] = this.distanceFunction(
        this.normFunction(point, this.points[i]),
        this.epsilon
      )
    }

    const distancesM = new Matrix(distances.map((d) => [d]))

    let sums: Position = [0, 0]

    for (let i = 0; i < 2; i++) {
      sums[i] = sumMatrix(mulitplyMatricesValues(distancesM, this.weights[i]))
    }

    return sums
  }
}
