import { parseAnnotation, validateMap } from '@allmaps/annotation'

import type { Map } from '@allmaps/annotation'
import type {
  OptionalTransformOptions,
  TransformationType
} from '@allmaps/transform'
import type { GCP } from '@allmaps/types'
import { parseGcpsFromFile, parseJsonFromFile } from './io.js'

export function parseMap(options: { annotation: string }): Map {
  let map
  if (options.annotation) {
    const annotation = parseJsonFromFile(options.annotation as string)
    const mapOrMaps = parseAnnotationValidateMap(annotation)

    if (Array.isArray(mapOrMaps) && mapOrMaps.length > 1) {
      throw new Error('Annotation must contain exactly 1 georeferenced map')
    }
    map = Array.isArray(mapOrMaps) ? mapOrMaps[0] : mapOrMaps
  }
  return map as Map
}

export function parseGcps(
  options: { gcps: string; annotation: string },
  map: Map
): GCP[] {
  let gcps
  if (options.gcps) {
    gcps = parseGcpsFromFile(options.gcps as string)
  } else if (options.annotation && map) {
    gcps = map.gcps
  } else {
    throw new Error('No GCPs supplied. Specify an annotation or GCPs.')
  }
  return gcps
}

export function parseTransformationType(
  options: {
    annotation: string
    transformationType: string
    transformationOrder: string
  },
  map: Map
): TransformationType {
  let transformationType
  if (
    options.transformationType == 'polynomial' &&
    options.transformationOrder == '1'
  ) {
    transformationType == 'polynomial1'
  } else if (
    options.transformationType == 'polynomial' &&
    options.transformationOrder == '2'
  ) {
    transformationType = 'polynomial2'
  } else if (
    options.transformationType == 'polynomial' &&
    options.transformationOrder == '3'
  ) {
    transformationType = 'polynomial3'
  } else if (options.transformationType) {
    transformationType = options.transformationType
  } else if (options.annotation && map) {
    transformationType = map.transformation?.type
  } else {
    transformationType = 'polynomial'
  }
  return transformationType as TransformationType
}

export function parseAnnotationValidateMap(jsonValue: unknown): Map[] | Map {
  if (
    jsonValue &&
    typeof jsonValue === 'object' &&
    'type' in jsonValue &&
    (jsonValue.type === 'Annotation' || jsonValue.type === 'AnnotationPage')
  ) {
    return parseAnnotation(jsonValue)
  } else {
    return validateMap(jsonValue)
  }
}

export function parseAnnotationsValidateMaps(jsonValues: unknown[]): Map[] {
  const maps = jsonValues.map(parseAnnotationValidateMap).flat()

  return maps
}

export function parseCoordinatesArrayArray(
  coordinatesString: string
): number[][] {
  // String from mutli line file where each line contains multiple coordinates separated by space (or multiple spaces or tabs)
  return coordinatesString
    .trim()
    .split('\n')
    .map((coordinatesLineString) =>
      coordinatesLineString
        .split(/[ \t]+/)
        .map((coordinateString) => Number(coordinateString.trim()))
    )
}

export function parseTransformOptions(
  options: unknown
): OptionalTransformOptions {
  const transformOptions: OptionalTransformOptions = {}

  if (options && typeof options === 'object') {
    if ('maxOffsetRatio' in options && options.maxOffsetRatio) {
      transformOptions.maxOffsetRatio = Number(options.maxOffsetRatio)
    }

    if ('maxDepth' in options && options.maxDepth) {
      transformOptions.maxDepth = Math.round(Number(options.maxDepth))
    }
  }

  return transformOptions
}
