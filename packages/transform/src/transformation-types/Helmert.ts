import { Matrix, pseudoInverse } from 'ml-matrix'

import { BaseLinearWeightsTransformation } from './BaseLinearWeightsTransformation.js'

import type { Point } from '@allmaps/types'

import type { HelmertMeasures } from '../shared/types.js'

export class Helmert extends BaseLinearWeightsTransformation {
  destinationPointsMatrices: [Matrix, Matrix]
  destinationPointsJointMatrix: Matrix

  coefsMatrix: Matrix

  weightsMatrices?: [Matrix, Matrix]
  weights?: [number[], number[]]
  weightsJointMatrix?: Matrix
  weightsJoint?: number[]

  constructor(sourcePoints: Point[], destinationPoints: Point[]) {
    super(sourcePoints, destinationPoints, 'helmert', 2)

    // 2D Helmert transformation (= similarity transformation)
    // This solution uses the 'Pseudo Inverse' for estimating a least-square solution, see https://en.wikipedia.org/wiki/Moore%E2%80%93Penrose_inverse

    // The system of equations is solved for x and y jointly (because they are inter-related)
    // Hence destinationPointsMatrix and helmertWeightsMatrix are one Matrix

    this.destinationPointsMatrices = [
      Matrix.columnVector(this.destinationPoints.map((value) => value[0])),
      Matrix.columnVector(this.destinationPoints.map((value) => value[1]))
    ]

    this.destinationPointsJointMatrix = Matrix.columnVector([
      ...this.destinationPoints.map((value) => value[0]),
      ...this.destinationPoints.map((value) => value[1])
    ])

    // Construct 2Nx4 Matrix helmertCoefsMatrices
    // 1 0 x0 -y0
    // 1 0 x1 -y1
    // ...
    // 0 1 y0 x0
    // 0 1 y1 x1
    // ...
    this.coefsMatrix = Matrix.zeros(2 * this.pointCount, 4)
    for (let i = 0; i < this.pointCount; i++) {
      this.coefsMatrix.set(i, 0, 1)
      this.coefsMatrix.set(i, 1, 0)
      this.coefsMatrix.set(i, 2, this.sourcePoints[i][0])
      this.coefsMatrix.set(i, 3, -this.sourcePoints[i][1])
      this.coefsMatrix.set(this.pointCount + i, 0, 0)
      this.coefsMatrix.set(this.pointCount + i, 1, 1)
      this.coefsMatrix.set(this.pointCount + i, 2, this.sourcePoints[i][1])
      this.coefsMatrix.set(this.pointCount + i, 3, this.sourcePoints[i][0])
    }
  }

  solve() {
    // Compute helmert weights by solving the linear system of equations for each component
    // Will result in a Matrix([[t_x], [t_y], [m], [n]])
    const pseudoInverseCoefsMatrix = pseudoInverse(this.coefsMatrix)

    this.weightsJointMatrix = pseudoInverseCoefsMatrix.mmul(
      this.destinationPointsJointMatrix
    )

    this.weightsJoint = this.weightsJointMatrix.to1DArray()

    this.weights = [
      this.weightsJoint.slice(0, this.pointCount),
      this.weightsJoint.slice(this.pointCount)
    ]
  }

  getMeasures(): HelmertMeasures {
    if (!this.weights) {
      this.solve()
    }

    if (!this.weightsJoint) {
      throw new Error('Helmert weights not computed')
    }

    const measures: Partial<HelmertMeasures> = {}

    measures.scale = Math.sqrt(
      this.weightsJoint[2] ** 2 + this.weightsJoint[3] ** 2
    )
    measures.rotation = Math.atan2(this.weightsJoint[3], this.weightsJoint[2])
    measures.translation = [this.weightsJoint[0], this.weightsJoint[1]]

    return measures as HelmertMeasures
  }

  // Evaluate the transformation function at a new point
  evaluateFunction(newSourcePoint: Point): Point {
    if (!this.weights) {
      this.solve()
    }

    if (!this.weightsJoint) {
      throw new Error('Helmert weights not computed')
    }

    // Apply the helmert coefficients to the input point
    const newDestinationPoint: Point = [
      this.weightsJoint[0] +
        this.weightsJoint[2] * newSourcePoint[0] -
        this.weightsJoint[3] * newSourcePoint[1],
      this.weightsJoint[1] +
        this.weightsJoint[2] * newSourcePoint[1] +
        this.weightsJoint[3] * newSourcePoint[0]
    ]
    // Alternatively, using derived helmert weights
    // this.translation[0] +
    //   this.scale * Math.cos(rotation) * newSourcePoint[0] -
    //   this.scale * Math.sin(rotation) * newSourcePoint[1],
    // this.translation[1] +
    //   this.scale * Math.cos(rotation) * newSourcePoint[1] +
    //   this.scale * Math.sin(rotation) * newSourcePoint[0]

    return newDestinationPoint
  }

  // Evaluate the transformation function's partial derivative to x at a new point
  evaluatePartialDerivativeX(_newSourcePoint: Point): Point {
    if (!this.weights) {
      this.solve()
    }

    if (!this.weightsJoint) {
      throw new Error('Helmert weights not computed')
    }

    // Apply the helmert coefficients to the input point
    const newDestinationPointPartDerX: Point = [
      this.weightsJoint[2],
      this.weightsJoint[3]
    ]

    return newDestinationPointPartDerX
  }

  // Evaluate the transformation function's partial derivative to y at a new point
  evaluatePartialDerivativeY(_newSourcePoint: Point): Point {
    if (!this.weights) {
      this.solve()
    }

    if (!this.weightsJoint) {
      throw new Error('Helmert weights not computed')
    }

    // Apply the helmert coefficients to the input point
    const newDestinationPointPartDerY: Point = [
      -this.weightsJoint[3],
      this.weightsJoint[2]
    ]

    return newDestinationPointPartDerY
  }
}
