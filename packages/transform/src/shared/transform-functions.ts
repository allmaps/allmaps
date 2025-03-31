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
  gcpTransformOptions?: Partial<GcpTransformOptions>
): Partial<GeneralGcpTransformOptions> {
  if (gcpTransformOptions === undefined) {
    return {}
  }

  const generalGcpTransformOptions =
    gcpTransformOptions as Partial<GeneralGcpTransformOptions>

  if (gcpTransformOptions.geoIsGeographic) {
    generalGcpTransformOptions.destinationIsGeographic =
      gcpTransformOptions.geoIsGeographic
  }

  if (gcpTransformOptions.postToGeo) {
    generalGcpTransformOptions.postForward = gcpTransformOptions.postToGeo
  }
  if (gcpTransformOptions.preToResource) {
    generalGcpTransformOptions.preBackward = gcpTransformOptions.preToResource
  }

  return generalGcpTransformOptions
}

export function gcpTransformerOptionsToGeneralGcpTransformerOptions(
  gcpTransformerOptions?: Partial<GcpTransformerOptions>
): Partial<GeneralGcpTransformerOptions> {
  if (gcpTransformerOptions === undefined) {
    return {}
  }

  // Note: None of the transformer options need to be adapted
  // only the transform options that could be included in them

  const generalGcpTransformerOptions =
    gcpTransformOptionsToGeneralGcpTransformOptions(
      gcpTransformerOptions
    ) as Partial<GeneralGcpTransformerOptions>

  return generalGcpTransformerOptions
}

export function generalGcpTransformOptionsToGcpTransformOptions(
  generalGcpTransformOptions?: Partial<GeneralGcpTransformOptions>
): Partial<GcpTransformOptions> {
  if (generalGcpTransformOptions === undefined) {
    return {}
  }

  const gcpTransformOptions =
    generalGcpTransformOptions as Partial<GcpTransformOptions>

  if (generalGcpTransformOptions.destinationIsGeographic) {
    gcpTransformOptions.geoIsGeographic =
      generalGcpTransformOptions.destinationIsGeographic
  }

  if (generalGcpTransformOptions.postForward) {
    gcpTransformOptions.postToGeo = generalGcpTransformOptions.postForward
  }
  if (generalGcpTransformOptions.preBackward) {
    gcpTransformOptions.preToResource = generalGcpTransformOptions.preBackward
  }

  return gcpTransformOptions
}

export function generalGcpTransformerOptionsToGcpTransformerOptions(
  generalGcpTransformerOptions?: Partial<GeneralGcpTransformerOptions>
): Partial<GcpTransformerOptions> {
  if (generalGcpTransformerOptions == undefined) {
    return {}
  }

  const gcpTransformerOptions =
    generalGcpTransformerOptions as Partial<GcpTransformerOptions>

  return gcpTransformerOptions
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
    minOffsetRatio: generalGcpTransformOptions.minOffsetRatio,
    minOffsetDistance: generalGcpTransformOptions.minOffsetDistance,
    minLineDistance: generalGcpTransformOptions.minLineDistance,
    maxDepth: generalGcpTransformOptions.maxDepth
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
    minOffsetRatio: generalGcpTransformOptions.minOffsetRatio,
    minOffsetDistance: generalGcpTransformOptions.minOffsetDistance,
    minLineDistance: generalGcpTransformOptions.minLineDistance,
    maxDepth: generalGcpTransformOptions.maxDepth
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
