import { Matrix, SingularValueDecomposition } from 'ml-matrix'

import type { Position } from '@allmaps/types'

export default class Projective {
  sourcePoints: Position[]
  destinationPoints: Position[]

  projectiveParametersMatrix: Matrix

  nPoints: number

  constructor(sourcePoints: Position[], destinationPoints: Position[]) {
    this.sourcePoints = sourcePoints
    this.destinationPoints = destinationPoints

    this.nPoints = this.sourcePoints.length

    if (this.nPoints < 4) {
      throw new Error(
        'Not enough controle points. A projective transformation requires a minimum of 4 points, but ' +
          this.nPoints +
          ' are given.'
      )
    }

    // 2D projective (= perspective) transformation
    // See https://citeseerx.ist.psu.edu/doc/10.1.1.186.4411 for more information

    // The system of equations is solved for x and y jointly (because they are inter-related)
    // Hence projectiveCoefsMatrix and projectiveParametersMatrix are one Matrix

    // Construct 2Nx9 Matrix projectiveCoefsMatrix
    // −x0 −y0 −1  0   0   0  x'0x0 x'0y0 x'0
    // 0   0   0   −x0 −y0 −1 y'0x0 y'0y0 y'0
    // ...
    const projectiveCoefsMatrix = Matrix.zeros(2 * this.nPoints, 9)
    for (let i = 0; i < this.nPoints; i++) {
      projectiveCoefsMatrix.set(2 * i, 0, -sourcePoints[i][0])
      projectiveCoefsMatrix.set(2 * i, 1, -sourcePoints[i][1])
      projectiveCoefsMatrix.set(2 * i, 2, -1)
      projectiveCoefsMatrix.set(2 * i, 3, 0)
      projectiveCoefsMatrix.set(2 * i, 4, 0)
      projectiveCoefsMatrix.set(2 * i, 5, 0)
      projectiveCoefsMatrix.set(
        2 * i,
        6,
        destinationPoints[i][0] * sourcePoints[i][0]
      )
      projectiveCoefsMatrix.set(
        2 * i,
        7,
        destinationPoints[i][0] * sourcePoints[i][1]
      )
      projectiveCoefsMatrix.set(2 * i, 8, destinationPoints[i][0])
      projectiveCoefsMatrix.set(2 * i + 1, 0, 0)
      projectiveCoefsMatrix.set(2 * i + 1, 1, 0)
      projectiveCoefsMatrix.set(2 * i + 1, 2, 0)
      projectiveCoefsMatrix.set(2 * i + 1, 3, -sourcePoints[i][0])
      projectiveCoefsMatrix.set(2 * i + 1, 4, -sourcePoints[i][1])
      projectiveCoefsMatrix.set(2 * i + 1, 5, -1)
      projectiveCoefsMatrix.set(
        2 * i + 1,
        6,
        destinationPoints[i][1] * sourcePoints[i][0]
      )
      projectiveCoefsMatrix.set(
        2 * i + 1,
        7,
        destinationPoints[i][1] * sourcePoints[i][1]
      )
      projectiveCoefsMatrix.set(2 * i + 1, 8, destinationPoints[i][1])
    }
    // Compute the last (i.e. 9th) 'right singular vector', i.e. the one with the smallest singular value. (For a set of gcps that exactly follow a projective transformations, the singular value is null and this vector spans the null-space)
    const svd = new SingularValueDecomposition(projectiveCoefsMatrix)
    this.projectiveParametersMatrix = Matrix.from1DArray(
      3,
      3,
      svd.rightSingularVectors.getColumn(8)
    ).transpose()
  }

  // The interpolant function will compute the value at any point.
  interpolant(newSourcePoint: Position): Position {
    if (!this.projectiveParametersMatrix) {
      throw new Error('projective parameters not computed')
    }

    // Compute the interpolated value by applying the coefficients to the input point
    const c =
      this.projectiveParametersMatrix.get(0, 2) * newSourcePoint[0] +
      this.projectiveParametersMatrix.get(1, 2) * newSourcePoint[1] +
      this.projectiveParametersMatrix.get(2, 2)
    const newDestinationPoint: Position = [
      (this.projectiveParametersMatrix.get(0, 0) * newSourcePoint[0] +
        this.projectiveParametersMatrix.get(1, 0) * newSourcePoint[1] +
        this.projectiveParametersMatrix.get(2, 0)) /
        c,
      (this.projectiveParametersMatrix.get(0, 1) * newSourcePoint[0] +
        this.projectiveParametersMatrix.get(1, 1) * newSourcePoint[1] +
        this.projectiveParametersMatrix.get(2, 1)) /
        c
    ]

    return newDestinationPoint
  }
}
