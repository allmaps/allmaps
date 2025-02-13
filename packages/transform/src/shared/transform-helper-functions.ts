// TODO: consider implementing these functions in stdlib instead of using dependencies
import getWorldMidpoint from '@turf/midpoint'
import getWorldDistance from '@turf/distance'

import { mergeOptions } from '@allmaps/stdlib'

import { defaultRefinementOptions } from './refinement-helper-functions.js'

import type { TransformOptions, RefinementOptions } from './types.js'

import type { Point } from '@allmaps/types'

// Options

export const defaultTransformOptions: TransformOptions = {
  maxDepth: 0,
  minOffsetRatio: 0,
  minOffsetDistance: Infinity,
  minLineDistance: Infinity,
  sourceIsGeographic: false,
  destinationIsGeographic: false,
  isMultiGeometry: false,
  differentHandedness: false,
  distortionMeasures: [],
  referenceScale: 1
}

export function refinementOptionsFromForwardTransformOptions(
  transformOptions: TransformOptions
): RefinementOptions {
  const refinementOptions = mergeOptions(defaultRefinementOptions, {
    minOffsetRatio: transformOptions.minOffsetRatio,
    minOffsetDistance: transformOptions.minOffsetDistance,
    minLineDistance: transformOptions.minLineDistance,
    maxDepth: transformOptions.maxDepth
  })

  if (transformOptions.sourceIsGeographic) {
    refinementOptions.sourceMidPointFunction = (point0: Point, point1: Point) =>
      getWorldMidpoint(point0, point1).geometry.coordinates as Point
  }
  if (transformOptions.destinationIsGeographic) {
    refinementOptions.destinationMidPointFunction = (
      point0: Point,
      point1: Point
    ) => getWorldMidpoint(point0, point1).geometry.coordinates as Point
    refinementOptions.destinationDistanceFunction = getWorldDistance
  }
  return refinementOptions
}

export function refinementOptionsFromBackwardTransformOptions(
  transformOptions: TransformOptions
): RefinementOptions {
  const refinementOptions = mergeOptions(defaultRefinementOptions, {
    minOffsetRatio: transformOptions.minOffsetRatio,
    minOffsetDistance: transformOptions.minOffsetDistance,
    minLineDistance: transformOptions.minLineDistance,
    maxDepth: transformOptions.maxDepth
  })

  if (transformOptions.destinationIsGeographic) {
    refinementOptions.sourceMidPointFunction = (point0: Point, point1: Point) =>
      getWorldMidpoint(point0, point1).geometry.coordinates as Point
  }
  if (transformOptions.sourceIsGeographic) {
    refinementOptions.destinationMidPointFunction = (
      point0: Point,
      point1: Point
    ) => getWorldMidpoint(point0, point1).geometry.coordinates as Point
    refinementOptions.destinationDistanceFunction = getWorldDistance
  }
  return refinementOptions
}
