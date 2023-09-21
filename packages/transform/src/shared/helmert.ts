import { Matrix, pseudoInverse } from 'ml-matrix'

import type { Transformation } from './types'

import type { Position } from '@allmaps/types'

export default class Helmert implements Transformation {
  sourcePositions: Position[]
  destinationPositions: Position[]

  helmertParametersMatrix: Matrix

  nPositions: number

  constructor(sourcePositions: Position[], destinationPositions: Position[]) {
    this.sourcePositions = sourcePositions
    this.destinationPositions = destinationPositions

    this.nPositions = this.sourcePositions.length

    if (this.nPositions < 2) {
      throw new Error(
        'Not enough control points. A helmert transformation requires a minimum of 2 points, but ' +
          this.nPositions +
          ' are given.'
      )
    }

    // 2D Helmert transformation (= similarity transformation)
    // This solution uses the 'Pseudo Inverse' for estimating a least-square solution, see https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse

    // The system of equations is solved for x and y jointly (because they are inter-related)
    // Hence destinationPositionsMatrix, helmertCoefsMatrix and helmertParametersMatrix are one Matrix

    const destinationPositionsMatrix: Matrix = Matrix.columnVector(
      destinationPositions.flat()
    )

    // Construct 2Nx4 Matrix helmertCoefsMatrix
    // 1 0 x0 -y0
    // 0 1 y0 x0
    // 1 0 x1 -y1
    // 0 1 y1 x1
    // ...
    const helmertCoefsMatrix = Matrix.zeros(2 * this.nPositions, 4)
    for (let i = 0; i < this.nPositions; i++) {
      helmertCoefsMatrix.set(2 * i, 0, 1)
      helmertCoefsMatrix.set(2 * i, 1, 0)
      helmertCoefsMatrix.set(2 * i, 2, sourcePositions[i][0])
      helmertCoefsMatrix.set(2 * i, 3, -sourcePositions[i][1])
      helmertCoefsMatrix.set(2 * i + 1, 0, 0)
      helmertCoefsMatrix.set(2 * i + 1, 1, 1)
      helmertCoefsMatrix.set(2 * i + 1, 2, sourcePositions[i][1])
      helmertCoefsMatrix.set(2 * i + 1, 3, sourcePositions[i][0])
    }
    // Compute helmert parameters by solving the linear system of equations for each target component
    // Will result in a Matrix([[t_x], [t_y], [m], [n]])
    const pseudoInverseHelmertCoefsMatrix = pseudoInverse(helmertCoefsMatrix)
    this.helmertParametersMatrix = pseudoInverseHelmertCoefsMatrix.mmul(
      destinationPositionsMatrix
    )
  }

  // The interpolant function will compute the value at any position.
  interpolate(newSourcePosition: Position): Position {
    if (!this.helmertParametersMatrix) {
      throw new Error('Helmert parameters not computed')
    }

    // Compute the interpolated value by applying the helmert coefficients to the input position
    const newDestinationPosition: Position = [
      this.helmertParametersMatrix.get(0, 0) +
        this.helmertParametersMatrix.get(2, 0) * newSourcePosition[0] -
        this.helmertParametersMatrix.get(3, 0) * newSourcePosition[1],
      this.helmertParametersMatrix.get(1, 0) +
        this.helmertParametersMatrix.get(3, 0) * newSourcePosition[0] +
        this.helmertParametersMatrix.get(2, 0) * newSourcePosition[1]
    ]

    return newDestinationPosition
  }
}
