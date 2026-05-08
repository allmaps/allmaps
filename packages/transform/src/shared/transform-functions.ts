// TODO: consider implementing these functions in stdlib instead of using dependencies
import getWorldMidpoint from '@turf/midpoint'
import getWorldDistance from '@turf/distance'

import { mergeOptions } from '@allmaps/stdlib'

import { defaultRefinementOptions } from './refinement-functions.js'

import type {
  GeneralGcpTransformerOptions,
  GcpTransformerOptions,
  GeneralGcpTransformOptions,
  GcpTransformOptions,
  RefinementOptions
} from './types.js'

import type { Point } from '@allmaps/types'

// Options

export const defaultGeneralGcpTransformOptions: GeneralGcpTransformOptions = {
  maxDepth: 0,
  minSourceDistance: 0,
  setMinSourceDistanceFromResolution: true,
  minDestinationDistance: 0,
  setMinDestinationDistanceFromResolution: true,
  minOffsetRatio: 0,
  minOffsetDistance: Infinity,
  minLineDistance: Infinity,
  sourceIsGeographic: false,
  destinationIsGeographic: false,
  isMultiGeometry: false,
  distortionMeasures: [],
  referenceScale: 1,
  preForward: (point: Point) => point,
  postForward: (point: Point) => point,
  preBackward: (point: Point) => point,
  postBackward: (point: Point) => point
}

export const defaultGeneralGcpTransformerOptions: GeneralGcpTransformerOptions =
  {
    differentHandedness: false,
    ...defaultGeneralGcpTransformOptions
  }

export function gcpTransformOptionsToGeneralGcpTransformOptions(
  partialGcpTransformOptions?: Partial<GcpTransformOptions>
): Partial<GeneralGcpTransformOptions> {
  if (partialGcpTransformOptions === undefined) {
    return {}
  }

  const partialGeneralGcpTransformOptions =
    partialGcpTransformOptions as Partial<GeneralGcpTransformOptions>

  if (partialGcpTransformOptions.geoIsGeographic) {
    partialGeneralGcpTransformOptions.destinationIsGeographic =
      partialGcpTransformOptions.geoIsGeographic
  }

  if (partialGcpTransformOptions.postToGeo) {
    partialGeneralGcpTransformOptions.postForward =
      partialGcpTransformOptions.postToGeo
  }
  if (partialGcpTransformOptions.preToResource) {
    partialGeneralGcpTransformOptions.preBackward =
      partialGcpTransformOptions.preToResource
  }

  return partialGeneralGcpTransformOptions
}

export function gcpTransformerOptionsToGeneralGcpTransformerOptions(
  partialGcpTransformerOptions?: Partial<GcpTransformerOptions>
): Partial<GeneralGcpTransformerOptions> {
  if (partialGcpTransformerOptions === undefined) {
    return {}
  }

  // Note: None of the transformer options need to be adapted
  // only the transform options that could be included in them

  const partialGeneralGcpTransformerOptions =
    gcpTransformOptionsToGeneralGcpTransformOptions(
      partialGcpTransformerOptions
    ) as Partial<GeneralGcpTransformerOptions>

  return partialGeneralGcpTransformerOptions
}

export function generalGcpTransformOptionsToGcpTransformOptions(
  partialGeneralGcpTransformOptions?: Partial<GeneralGcpTransformOptions>
): Partial<GcpTransformOptions> {
  if (partialGeneralGcpTransformOptions === undefined) {
    return {}
  }

  const partialGcpTransformOptions =
    partialGeneralGcpTransformOptions as Partial<GcpTransformOptions>

  if (partialGeneralGcpTransformOptions.destinationIsGeographic) {
    partialGcpTransformOptions.geoIsGeographic =
      partialGeneralGcpTransformOptions.destinationIsGeographic
  }

  if (partialGeneralGcpTransformOptions.postForward) {
    partialGcpTransformOptions.postToGeo =
      partialGeneralGcpTransformOptions.postForward
  }
  if (partialGeneralGcpTransformOptions.preBackward) {
    partialGcpTransformOptions.preToResource =
      partialGeneralGcpTransformOptions.preBackward
  }

  return partialGcpTransformOptions
}

export function generalGcpTransformerOptionsToGcpTransformerOptions(
  partialGeneralGcpTransformerOptions?: Partial<GeneralGcpTransformerOptions>
): Partial<GcpTransformerOptions> {
  if (partialGeneralGcpTransformerOptions == undefined) {
    return {}
  }

  const partialGcpTransformerOptions =
    partialGeneralGcpTransformerOptions as Partial<GcpTransformerOptions>

  return partialGcpTransformerOptions
}

export const defaultGcpTransformOptions: GcpTransformOptions =
  generalGcpTransformOptionsToGcpTransformOptions(
    defaultGeneralGcpTransformOptions
  ) as GcpTransformOptions

export const defaultGcpTransformerOptions: GcpTransformerOptions =
  generalGcpTransformerOptionsToGcpTransformerOptions(
    defaultGeneralGcpTransformerOptions
  ) as GcpTransformerOptions

export function refinementOptionsFromForwardTransformOptions(
  generalGcpTransformOptions: GeneralGcpTransformOptions
): RefinementOptions {
  const refinementOptions = mergeOptions(defaultRefinementOptions, {
    maxDepth: generalGcpTransformOptions.maxDepth,
    minSourceDistance: generalGcpTransformOptions.minSourceDistance,
    minDestinationDistance: generalGcpTransformOptions.minDestinationDistance,
    minOffsetRatio: generalGcpTransformOptions.minOffsetRatio,
    minOffsetDistance: generalGcpTransformOptions.minOffsetDistance,
    minLineDistance: generalGcpTransformOptions.minLineDistance
  })

  if (generalGcpTransformOptions.sourceIsGeographic) {
    refinementOptions.sourceMidPointFunction = (point0: Point, point1: Point) =>
      getWorldMidpoint(point0, point1).geometry.coordinates as Point
  }
  if (generalGcpTransformOptions.destinationIsGeographic) {
    refinementOptions.destinationMidPointFunction = (
      point0: Point,
      point1: Point
    ) => getWorldMidpoint(point0, point1).geometry.coordinates as Point
    refinementOptions.destinationDistanceFunction = getWorldDistance
  }
  return refinementOptions
}

export function refinementOptionsFromBackwardTransformOptions(
  generalGcpTransformOptions: GeneralGcpTransformOptions
): RefinementOptions {
  const refinementOptions = mergeOptions(defaultRefinementOptions, {
    maxDepth: generalGcpTransformOptions.maxDepth,
    minSourceDistance: generalGcpTransformOptions.minSourceDistance,
    minDestinationDistance: generalGcpTransformOptions.minDestinationDistance,
    minOffsetRatio: generalGcpTransformOptions.minOffsetRatio,
    minOffsetDistance: generalGcpTransformOptions.minOffsetDistance,
    minLineDistance: generalGcpTransformOptions.minLineDistance
  })

  if (generalGcpTransformOptions.destinationIsGeographic) {
    refinementOptions.sourceMidPointFunction = (point0: Point, point1: Point) =>
      getWorldMidpoint(point0, point1).geometry.coordinates as Point
  }
  if (generalGcpTransformOptions.sourceIsGeographic) {
    refinementOptions.destinationMidPointFunction = (
      point0: Point,
      point1: Point
    ) => getWorldMidpoint(point0, point1).geometry.coordinates as Point
    refinementOptions.destinationDistanceFunction = getWorldDistance
  }
  return refinementOptions
}
