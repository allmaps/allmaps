import Helmert from './helmert.js'

import type { PartialTransformOptions, Transformation } from './types'

import type { Point } from '@allmaps/types'

export default class Straight implements Transformation {
  sourcePoints: Point[]
  destinationPoints: Point[]

  options?: PartialTransformOptions

  scale?: number
  sourcePointsCenter: Point
  destinationPointsCenter: Point
  translation?: Point

  pointCount: number

  constructor(
    sourcePoints: Point[],
    destinationPoints: Point[],
    options?: PartialTransformOptions
  ) {
    this.sourcePoints = sourcePoints
    this.destinationPoints = destinationPoints
    this.options = options

    this.pointCount = this.sourcePoints.length

    if (this.pointCount < 2) {
      throw new Error(
        'Not enough control points. A straight transformation requires a minimum of 2 points, but ' +
          this.pointCount +
          ' are given.'
      )
    }

    // Compute the corrensponing Helmert transform and get the scale from it
    const helmertTransformation = new Helmert(sourcePoints, destinationPoints)
    this.scale = helmertTransformation.scale

    if (!this.scale) {
      throw new Error('Scale could not be computed')
    }

    // Compute the centers of the source points and destination points
    this.sourcePointsCenter = this.sourcePoints
      .reduce((center, point) => [center[0] + point[0], center[1] + point[1]])
      .map((coordinate) => coordinate / this.pointCount) as Point
    this.destinationPointsCenter = this.destinationPoints
      .reduce((center, point) => [center[0] + point[0], center[1] + point[1]])
      .map((coordinate) => coordinate / this.pointCount) as Point

    // Compute the translation vector from the (scaled) center of the source points to the center of the destination points
    const scale = this.scale
    this.translation = this.destinationPointsCenter.map(
      (coord, i) => coord - this.sourcePointsCenter[i] * scale
    ) as Point
  }

  // The interpolant function will compute the value at any point.
  interpolate(newSourcePoint: Point): Point {
    if (!this.scale || !this.translation) {
      throw new Error('Straight parameters not computed')
    }

    const newDestinationPoint: Point = [
      this.translation[0] + this.scale * newSourcePoint[0],
      this.translation[1] + this.scale * newSourcePoint[1]
    ]

    return newDestinationPoint
  }
}
