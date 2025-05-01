import { Helmert } from './Helmert.js'

import { BaseTransformation } from './BaseTransformation.js'

import type { Point } from '@allmaps/types'

export class Straight extends BaseTransformation {
  weights?: {
    scale: number
    sourcePointsCenter: Point
    destinationPointsCenter: Point
    translation: Point
  }

  constructor(sourcePoints: Point[], destinationPoints: Point[]) {
    super(sourcePoints, destinationPoints, 'straight', 2)
  }

  solve() {
    // Compute the corrensponing Helmert transform and get the scale from it
    const helmertTransformation = new Helmert(
      this.sourcePoints,
      this.destinationPoints
    )
    const scale = helmertTransformation.getMeasures().scale

    // Compute the centers of the source points and destination points
    const sourcePointsCenter = this.sourcePoints
      .reduce((center, point) => [center[0] + point[0], center[1] + point[1]])
      .map((coordinate) => coordinate / this.pointCount) as Point
    const destinationPointsCenter = this.destinationPoints
      .reduce((center, point) => [center[0] + point[0], center[1] + point[1]])
      .map((coordinate) => coordinate / this.pointCount) as Point

    // Compute the translation vector from the (scaled) center of the source points to the center of the destination points
    const translation = destinationPointsCenter.map(
      (coord, i) => coord - sourcePointsCenter[i] * scale
    ) as Point

    this.weights = {
      scale,
      sourcePointsCenter,
      destinationPointsCenter,
      translation
    }
  }

  // Evaluate the transformation function at a new point
  evaluateFunction(newSourcePoint: Point): Point {
    if (!this.weights) {
      this.solve()
    }

    if (!this.weights) {
      throw new Error('Weights not computed')
    }

    const newDestinationPoint: Point = [
      this.weights.translation[0] + this.weights.scale * newSourcePoint[0],
      this.weights.translation[1] + this.weights.scale * newSourcePoint[1]
    ]

    return newDestinationPoint
  }

  // Evaluate the transformation function's partial derivative to x at a new point
  evaluatePartialDerivativeX(_newSourcePoint: Point): Point {
    if (!this.weights) {
      this.solve()
    }

    if (!this.weights) {
      throw new Error('Weights not computed')
    }

    const newDestinationPointPartDerX: Point = [this.weights.scale, 0]

    return newDestinationPointPartDerX
  }

  // Evaluate the transformation function's partial derivative to y at a new point
  evaluatePartialDerivativeY(_newSourcePoint: Point): Point {
    if (!this.weights) {
      this.solve()
    }

    if (!this.weights) {
      throw new Error('Weights not computed')
    }

    const newDestinationPointPartDerY: Point = [0, this.weights.scale]

    return newDestinationPointPartDerY
  }
}
