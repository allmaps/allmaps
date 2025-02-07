// TODO: consider implementing these functions in stdlib instead of using dependencies
import getWorldMidpoint from '@turf/midpoint'
import getWorldDistance from '@turf/distance'

import { flipY, mergeOptions } from '@allmaps/stdlib'

import { GcpTransformer } from '../transformer'
import {
  refineLineString,
  refineRing,
  defaultRefinementOptions,
  getRefinementSourceResolution
} from './refinement-helper-functions.js'
import { invertGeneralGcp } from './conversion-functions.js'
import { computeDistortionsFromPartialDerivatives } from '../distortion.js'

import type {
  GeneralGcpAndDistortions,
  DistortionMeasure,
  TransformOptions,
  RefinementOptions
} from './types.js'

import type {
  Point,
  LineString,
  Ring,
  Polygon,
  Bbox,
  TypedLineString,
  TypedRing,
  TypedPolygon
} from '@allmaps/types'

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

// Transform Geometries

export function transformPointForward<P>(
  point: Point,
  transformer: GcpTransformer,
  transformOptions: TransformOptions,
  generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
): P {
  const forwardTransformation = transformer.getForwardTransformation()

  const source = transformOptions.differentHandedness ? flipY(point) : point
  const destination = forwardTransformation.evaluateFunction(source)

  let partialDerivativeX = undefined
  let partialDerivativeY = undefined
  let distortions = new Map<DistortionMeasure, number>()

  if (transformOptions.distortionMeasures.length > 0) {
    partialDerivativeX =
      forwardTransformation.evaluatePartialDerivativeX(source)
    partialDerivativeY =
      forwardTransformation.evaluatePartialDerivativeY(source)

    distortions = computeDistortionsFromPartialDerivatives(
      transformOptions.distortionMeasures,
      partialDerivativeX,
      partialDerivativeY,
      transformOptions.referenceScale
    )
  }

  return generalGcpToP({
    source: point, // don't apply differentHandedness here, this is only internally.
    destination,

    partialDerivativeX,
    partialDerivativeY,
    distortions
  })
}

export function transformPointBackward<P>(
  point: Point,
  transformer: GcpTransformer,
  transformOptions: TransformOptions,
  generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
): P {
  const backwardTransformation = transformer.getBackwardTransformation()

  const destination = point
  let source = backwardTransformation.evaluateFunction(destination)
  // apply differentHandedness here again, so it has been applied twice in total and is undone now.
  source = transformOptions.differentHandedness ? flipY(source) : source

  let partialDerivativeX = undefined
  let partialDerivativeY = undefined
  let distortions = new Map<DistortionMeasure, number>()

  if (transformOptions.distortionMeasures.length > 0) {
    partialDerivativeX =
      backwardTransformation.evaluatePartialDerivativeX(destination)
    partialDerivativeX = transformOptions.differentHandedness
      ? flipY(partialDerivativeX)
      : partialDerivativeX
    partialDerivativeY =
      backwardTransformation.evaluatePartialDerivativeY(destination)
    partialDerivativeY = transformOptions.differentHandedness
      ? flipY(partialDerivativeY)
      : partialDerivativeY

    distortions = computeDistortionsFromPartialDerivatives(
      transformOptions.distortionMeasures,
      partialDerivativeX,
      partialDerivativeY,
      transformOptions.referenceScale
    )
  }

  return generalGcpToP({
    source,
    destination,

    partialDerivativeX,
    partialDerivativeY,
    distortions
  })
}

export function transformLineStringForward<P>(
  lineString: LineString,
  transformer: GcpTransformer,
  transformOptions: TransformOptions,
  generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
): TypedLineString<P> {
  return refineLineString(
    lineString,
    (p) => transformer.transformForward(p),
    refinementOptionsFromForwardTransformOptions(transformOptions)
  ).map((generalGcp) => generalGcpToP(generalGcp))
}

export function transformLineStringBackward<P>(
  lineString: LineString,
  transformer: GcpTransformer,
  transformOptions: TransformOptions,
  generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
): TypedLineString<P> {
  return refineLineString(
    lineString,
    (p) => transformer.transformBackward(p),
    refinementOptionsFromBackwardTransformOptions(transformOptions)
  ).map((generalGcp) => generalGcpToP(invertGeneralGcp(generalGcp)))
}

export function transformRingForward<P>(
  ring: Ring,
  transformer: GcpTransformer,
  transformOptions: TransformOptions,
  generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
): TypedRing<P> {
  return refineRing(
    ring,
    (p) => transformer.transformForward(p),
    refinementOptionsFromForwardTransformOptions(transformOptions)
  ).map((generalGcp) => generalGcpToP(generalGcp))
}

export function transformRingBackward<P>(
  ring: Ring,
  transformer: GcpTransformer,
  transformOptions: TransformOptions,
  generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
): TypedRing<P> {
  return refineRing(
    ring,
    (p) => transformer.transformBackward(p),
    refinementOptionsFromBackwardTransformOptions(transformOptions)
  ).map((generalGcp) => generalGcpToP(invertGeneralGcp(generalGcp)))
}

export function transformPolygonForward<P>(
  polygon: Polygon,
  transformer: GcpTransformer,
  transformOptions: TransformOptions,
  generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
): TypedPolygon<P> {
  return polygon.map((ring) => {
    return transformRingForward(
      ring,
      transformer,
      transformOptions,
      generalGcpToP
    )
  })
}

export function transformPolygonBackward<P>(
  polygon: Polygon,
  transformer: GcpTransformer,
  transformOptions: TransformOptions,
  generalGcpToP: (generalGcp: GeneralGcpAndDistortions) => P
): TypedPolygon<P> {
  return polygon.map((ring) => {
    return transformRingBackward(
      ring,
      transformer,
      transformOptions,
      generalGcpToP
    )
  })
}

// Get transform resource resolution

export function getForwardTransformResolution(
  bbox: Bbox,
  transformer: GcpTransformer,
  partialTransformOptions: Partial<TransformOptions>
): number | undefined {
  const transformOptions = mergeOptions(
    transformer.options,
    partialTransformOptions
  )
  return getRefinementSourceResolution(
    bbox,
    (p) => transformer.transformForward(p),
    refinementOptionsFromForwardTransformOptions(transformOptions)
  )
}

export function getBackwardTransformResolution(
  bbox: Bbox,
  transformer: GcpTransformer,
  partialTransformOptions: Partial<TransformOptions>
): number | undefined {
  const transformOptions = mergeOptions(
    transformer.options,
    partialTransformOptions
  )
  return getRefinementSourceResolution(
    bbox,
    (p) => transformer.transformBackward(p),
    refinementOptionsFromBackwardTransformOptions(transformOptions)
  )
}
