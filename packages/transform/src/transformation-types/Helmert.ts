import {
  newArrayMatrix,
  pasteArrayMatrix,
  arrayMatrixSize
} from '@allmaps/stdlib'

import { BaseLinearWeightsTransformation } from './BaseLinearWeightsTransformation.js'
import { solveJointlyPseudoInverse } from '../shared/solve-functions.js'

import type { Point, Size } from '@allmaps/types'

import type { HelmertMeasures } from '../shared/types.js'

/**
 * 2D Helmert transformation (= similarity transformation)
 *
 * This transformation is a composition of a translation, rotation and scaling. There is no shearing.
 *
 * For this transformations, the system of equations is solved for x and y jointly.
 */
export class Helmert extends BaseLinearWeightsTransformation {
  coefsArrayMatrices?: [number[][], number[][]]
  coefsArrayMatricesSize?: [Size, Size]

  weightsArray?: number[]
  weightsArrays?: [number[], number[]]

  measures?: HelmertMeasures

  constructor(
    sourcePoints: Point[],
    destinationPoints: Point[],
    weightsArray?: number[]
  ) {
    super(sourcePoints, destinationPoints, 'helmert', 2)

    this.coefsArrayMatrices = this.getCoefsArrayMatrices()
    this.coefsArrayMatricesSize = this.coefsArrayMatrices.map(
      (coefsArrayMatrix) => arrayMatrixSize(coefsArrayMatrix)
    ) as [[number, number], [number, number]]

    if (weightsArray) {
      this.weightsArray = weightsArray
      this.weightsArrays = [weightsArray, weightsArray]
    }
  }

  getDestinationPointsArrays(): [number[], number[]] {
    return [
      this.destinationPoints.map((value) => value[0]),
      this.destinationPoints.map((value) => value[1])
    ]
  }

  getCoefsArrayMatrices(): [number[][], number[][]] {
    let coefsArrayMatrix0 = newArrayMatrix(this.pointCount, 4, 0)
    let coefsArrayMatrix1 = newArrayMatrix(this.pointCount, 4, 0)
    for (let i = 0; i < this.pointCount; i++) {
      const sourcePointCoefsArrays = this.getSourcePointCoefsArrays(
        this.sourcePoints[i]
      )
      coefsArrayMatrix0 = pasteArrayMatrix(coefsArrayMatrix0, i, 0, [
        sourcePointCoefsArrays[0]
      ])
      coefsArrayMatrix1 = pasteArrayMatrix(coefsArrayMatrix1, i, 0, [
        sourcePointCoefsArrays[1]
      ])
    }

    return [coefsArrayMatrix0, coefsArrayMatrix1]
  }

  /**
   * Get two 1x4 coefsArrays, populating the 2Nx4 coefsArrayMatrices
   * 1 0 x0 -y0
   * 1 0 x1 -y1
   * ...
   * 0 1 y0 x0
   * 0 1 y1 x1
   * ...
   *
   * @param sourcePoint
   */
  getSourcePointCoefsArrays(sourcePoint: Point): [number[], number[]] {
    return [
      [1, 0, sourcePoint[0], -sourcePoint[1]],
      [0, 1, sourcePoint[1], sourcePoint[0]]
    ]
  }

  solve() {
    const coefsArrayMatrices = this.getCoefsArrayMatrices()
    this.weightsArray = solveJointlyPseudoInverse(
      coefsArrayMatrices,
      this.destinationPointsArrays
    )
    this.weightsArrays = [this.weightsArray, this.weightsArray]
  }

  getMeasures(): HelmertMeasures {
    if (!this.measures) {
      const weightsArrays = this.getWeightsArrays()
      const weightsArray = weightsArrays[0]

      const scale = Math.sqrt(weightsArray[2] ** 2 + weightsArray[3] ** 2)
      const rotation = Math.atan2(weightsArray[3], weightsArray[2])
      const translation = [weightsArray[0], weightsArray[1]] as Point

      this.measures = { scale, rotation, translation }
    }

    return this.measures
  }

  evaluateFunction(newSourcePoint: Point): Point {
    const weightsArrays = this.getWeightsArrays()
    const weightsArray = weightsArrays[0]

    const newDestinationPoint: Point = [
      weightsArray[0] +
        weightsArray[2] * newSourcePoint[0] -
        weightsArray[3] * newSourcePoint[1],
      weightsArray[1] +
        weightsArray[2] * newSourcePoint[1] +
        weightsArray[3] * newSourcePoint[0]
    ]
    // Alternatively, using derived helmert measures
    // this.translation[0] +
    //   this.scale * Math.cos(rotation) * newSourcePoint[0] -
    //   this.scale * Math.sin(rotation) * newSourcePoint[1],
    // this.translation[1] +
    //   this.scale * Math.cos(rotation) * newSourcePoint[1] +
    //   this.scale * Math.sin(rotation) * newSourcePoint[0]

    return newDestinationPoint
  }

  evaluatePartialDerivativeX(_newSourcePoint: Point): Point {
    const weightsArrays = this.getWeightsArrays()
    const weightsArray = weightsArrays[0]

    const newDestinationPointPartDerX: Point = [
      weightsArray[2],
      weightsArray[3]
    ]

    return newDestinationPointPartDerX
  }

  evaluatePartialDerivativeY(_newSourcePoint: Point): Point {
    const weightsArrays = this.getWeightsArrays()
    const weightsArray = weightsArrays[0]

    const newDestinationPointPartDerY: Point = [
      -weightsArray[3],
      weightsArray[2]
    ]

    return newDestinationPointPartDerY
  }

  getTransformationDataAsFloat64Array(): {
    weights: Float64Array
    sourcePoints: Float64Array
  } {
    const weightsArrays = this.getWeightsArrays()
    const weightsArray = weightsArrays[0]

    // Helmert: [w0, w1, w2, w3]
    return {
      weights: new Float64Array(weightsArray),
      sourcePoints: new Float64Array(0)
    }
  }
}
