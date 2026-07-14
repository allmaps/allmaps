import { midPoint, scalePoint, translatePoint } from '@allmaps/stdlib'

import { Helmert } from './Helmert.js'
import { BaseTransformation } from './BaseTransformation.js'

import type { Point } from '@allmaps/types'

import type { StraightMeasures } from '../shared/types.js'

export class Straight extends BaseTransformation {
  weightsArrays?: [number[], number[]]

  measures?: StraightMeasures

  constructor(
    sourcePoints: Point[],
    destinationPoints: Point[],
    measures?: StraightMeasures
  ) {
    super(sourcePoints, destinationPoints, 'straight', 2)

    if (measures) {
      this.measures = measures
    }
  }

  /** Solve the x and y components jointly.
   *
   * This computes the corresponding Helmert transform and get the scale from it.
   */
  solve() {
    const helmertTransformation = new Helmert(
      this.sourcePoints,
      this.destinationPoints
    )
    this.weightsArrays = helmertTransformation.getWeightsArrays()
  }

  getWeightsArrays(): [number[], number[]] {
    if (!this.weightsArrays) {
      this.solve()
    }

    if (!this.weightsArrays) {
      throw new Error('Weights not computed')
    }

    return this.weightsArrays
  }

  getMeasures(): StraightMeasures {
    if (!this.measures) {
      const weightsArrays = this.getWeightsArrays()
      const weightsArray = weightsArrays[0]

      const scale = Math.sqrt(weightsArray[2] ** 2 + weightsArray[3] ** 2)
      const translation = translatePoint(
        midPoint(...this.destinationPoints),
        scalePoint(midPoint(...this.sourcePoints), scale),
        'substract'
      )

      this.measures = { scale, translation }
    }

    return this.measures
  }

  // Evaluate the transformation function at a new point
  evaluateFunction(newSourcePoint: Point): Point {
    const { scale, translation } = this.getMeasures()

    const newDestinationPoint: Point = [
      translation[0] + scale * newSourcePoint[0],
      translation[1] + scale * newSourcePoint[1]
    ]

    return newDestinationPoint
  }

  // Evaluate the transformation function's partial derivative to x at a new point
  evaluatePartialDerivativeX(_newSourcePoint: Point): Point {
    const { scale } = this.getMeasures()

    const newDestinationPointPartDerX: Point = [scale, 0]

    return newDestinationPointPartDerX
  }

  // Evaluate the transformation function's partial derivative to y at a new point
  evaluatePartialDerivativeY(_newSourcePoint: Point): Point {
    const { scale } = this.getMeasures()

    const newDestinationPointPartDerY: Point = [0, scale]

    return newDestinationPointPartDerY
  }

  getTransformationDataAsFloat64Array(): {
    weights: Float64Array
    sourcePoints: Float64Array
  } {
    const { scale, translation } = this.getMeasures()

    // Straight: [tx, ty, scale]
    return {
      weights: new Float64Array([translation[0], translation[1], scale]),
      sourcePoints: new Float64Array(0)
    }
  }
}
