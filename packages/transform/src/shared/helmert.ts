import { Matrix, pseudoInverse } from 'ml-matrix'

import type { Transformation } from './types'

import type { Point } from '@allmaps/types'

export default class Helmert implements Transformation {
  sourcePoints: Point[]
  destinationPoints: Point[]

  helmertParametersMatrix: Matrix

  pointCount: number

  constructor(sourcePoints: Point[], destinationPoints: Point[]) {
    this.sourcePoints = sourcePoints
    this.destinationPoints = destinationPoints

    this.pointCount = this.sourcePoints.length

    if (this.pointCount < 2) {
      throw new Error(
        'Not enough control points. A helmert transformation requires a minimum of 2 points, but ' +
          this.pointCount +
          ' are given.'
      )
    }

    // 2D Helmert transformation (= similarity transformation)
    // This solution uses the 'Pseudo Inverse' for estimating a least-square solution, see https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse

    // The system of equations is solved for x and y jointly (because they are inter-related)
    // Hence destinationPointsMatrix, helmertCoefsMatrix and helmertParametersMatrix are one Matrix

    const destinationPointsMatrix: Matrix = Matrix.columnVector(
      destinationPoints.flat()
    )

    // Construct 2Nx4 Matrix helmertCoefsMatrix
    // 1 0 x0 -y0
    // 0 1 y0 x0
    // 1 0 x1 -y1
    // 0 1 y1 x1
    // ...
    const helmertCoefsMatrix = Matrix.zeros(2 * this.pointCount, 4)
    for (let i = 0; i < this.pointCount; i++) {
      helmertCoefsMatrix.set(2 * i, 0, 1)
      helmertCoefsMatrix.set(2 * i, 1, 0)
      helmertCoefsMatrix.set(2 * i, 2, sourcePoints[i][0])
      helmertCoefsMatrix.set(2 * i, 3, -sourcePoints[i][1])
      helmertCoefsMatrix.set(2 * i + 1, 0, 0)
      helmertCoefsMatrix.set(2 * i + 1, 1, 1)
      helmertCoefsMatrix.set(2 * i + 1, 2, sourcePoints[i][1])
      helmertCoefsMatrix.set(2 * i + 1, 3, sourcePoints[i][0])
    }
    // Compute helmert parameters by solving the linear system of equations for each target component
    // Will result in a Matrix([[t_x], [t_y], [m], [n]])
    const pseudoInverseHelmertCoefsMatrix = pseudoInverse(helmertCoefsMatrix)
    this.helmertParametersMatrix = pseudoInverseHelmertCoefsMatrix.mmul(
      destinationPointsMatrix
    )
  }

  // The interpolant function will compute the value at any point.
  interpolate(newSourcePoint: Point): Point {
    if (!this.helmertParametersMatrix) {
      throw new Error('Helmert parameters not computed')
    }

    // Compute the interpolated value by applying the helmert coefficients to the input point
    const newDestinationPoint: Point = [
      this.helmertParametersMatrix.get(0, 0) +
        this.helmertParametersMatrix.get(2, 0) * newSourcePoint[0] -
        this.helmertParametersMatrix.get(3, 0) * newSourcePoint[1],
      this.helmertParametersMatrix.get(1, 0) +
        this.helmertParametersMatrix.get(2, 0) * newSourcePoint[1] +
        this.helmertParametersMatrix.get(3, 0) * newSourcePoint[0]
    ]

    return newDestinationPoint
  }
}
