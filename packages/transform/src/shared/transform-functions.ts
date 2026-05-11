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

export const nonWarpingTransformationTypes = [
  'helmert',
  'polynomial',
  'polynomial1'
]

export const defaultGeneralGcpTransformOptions: GeneralGcpTransformOptions = {
  maxDepth: 0,
  minSourceDistance: 0,
  minDestinationDistance: 0,
  minOffsetRatio: 0,
  minOffsetDistance: Infinity,
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
  if (
    partialGcpTransformOptions === undefined ||
    Object.keys(partialGcpTransformOptions).length === 0
  ) {
    return {}
  }

  const partialGeneralGcpTransformOptions =
    partialGcpTransformOptions as Partial<GeneralGcpTransformOptions>

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
  const refinementOptions = mergeOptions(
    defaultRefinementOptions,
    generalGcpTransformOptions
  )

  return refinementOptions
}

export function refinementOptionsFromBackwardTransformOptions(
  generalGcpTransformOptions: GeneralGcpTransformOptions
): RefinementOptions {
  const refinementOptions = mergeOptions(
    defaultRefinementOptions,
    generalGcpTransformOptions
  )

  return refinementOptions
}
