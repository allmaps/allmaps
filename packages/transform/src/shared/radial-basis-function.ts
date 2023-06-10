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
  const mul = Matrix.zeros(matrix1.rows, matrix1.columns)

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

    // construct 3xN matrix
    // 1  1  1  1
    // x0 x1 x2 x3
    // y0 y1 y2 y3
    const N = Matrix.zeros(3, points.length)
    for (let i = 0; i < N.columns; i++) {
      N.set(0, i, 1)
      N.set(1, i, points[i][0])
      N.set(2, i, points[i][1])
    }
    // combine with M in new matrix N
    // TODO: clean blockmatrices
    const MN = Matrix.zeros(points.length + 3, points.length + 3)
    for (let i = 0; i < MN.rows; i++) {
      for (let j = 0; j < MN.columns; j++) {
        if (i < M.rows && j < M.columns) {
          MN.set(i, j, M.get(i, j))
        } else if (i >= M.rows && j < M.columns) {
          MN.set(i, j, N.get(i - M.rows, j))
        } else if (i < M.rows && j >= M.columns) {
          MN.set(i, j, N.transpose().get(i, j - M.columns))
        }
      }
    }

    // reshape values by dimension/component
    const valuesByDimension = new Array(2)
    for (let i = 0; i < 2; i++) {
      valuesByDimension[i] = [...values.map((value) => value[i]), 0, 0, 0]
    }

    // Compute basis functions weights by solving
    // the linear system of equations for each target component
    // let this.weights: [Matrix, Matrix]
    this.weights = [
      solve(MN, Matrix.columnVector(valuesByDimension[0])),
      solve(MN, Matrix.columnVector(valuesByDimension[1]))
    ]
  }

  // The returned interpolant will compute the value at any point
  // by summing the weighted contributions of the input points
  interpolant(point: Position): Position {
    if (!this.weights) {
      throw new Error('Weights not computed')
    }

    const distances = new Array(this.points.length)
    for (let i = 0; i < this.points.length; i++) {
      distances[i] = this.distanceFunction(
        this.normFunction(point, this.points[i]),
        this.epsilon
      )
    }

    const distancesMN = new Matrix(distances.map((d) => [d]))

    const sums: Position = [0, 0]

    for (let i = 0; i < 2; i++) {
      // sums[i] = sumMatrix(mulitplyMatricesValues(distancesM, this.weights[i]))
      const a0 = this.weights[i].get(this.points.length, 0)
      const ax = this.weights[i].get(this.points.length + 1, 0)
      const ay = this.weights[i].get(this.points.length + 2, 0)

      sums[i] =
        a0 +
        ax * point[0] +
        ay * point[1] +
        sumMatrix(
          mulitplyMatricesValues(
            distancesMN,
            this.weights[i].selection(
              [...Array(this.points.length).keys()],
              [0]
            )
          )
        )
    }

    return sums
  }
}
