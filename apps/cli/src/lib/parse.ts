import { parseAnnotation, validateMap } from '@allmaps/annotation'

import type { Map as GeoreferencedMap } from '@allmaps/annotation'
import type { TransformOptions, TransformationType } from '@allmaps/transform'
import type { Gcp } from '@allmaps/types'
import { readFromFile, parseJsonFromFile } from './io.js'

export function parseMap(options: { annotation?: string }): GeoreferencedMap {
  if (options.annotation) {
    const annotation = parseJsonFromFile(options.annotation)
    const mapOrMaps = parseAnnotationValidateMap(annotation)

    if (Array.isArray(mapOrMaps) && mapOrMaps.length > 1) {
      throw new Error('Annotation must contain exactly 1 georeferenced map')
    }
    const map = Array.isArray(mapOrMaps) ? mapOrMaps[0] : mapOrMaps
    return map
  }

  throw new Error('No Georeference Annotation supplied')
}

export function parseGcps(
  options: { gcps?: string; annotation?: string },
  map?: GeoreferencedMap
): Gcp[] {
  let gcps
  if (options.gcps) {
    gcps = parseGcpsFromFile(options.gcps)
  } else if (map) {
    gcps = map.gcps
  } else {
    throw new Error(
      'No GCPs supplied. Supply a Georeference Annotation or a file containing GCPs.'
    )
  }

  return gcps
}

export function parseGcpsFromFile(file: string): Gcp[] {
  // TODO: also allow file to contain GCPs in the Georeference Annotation GCP format
  return (
    parseCoordinateArrayArrayFromFile(file) as [
      [number, number, number, number]
    ]
  ).map((coordinateArray) => ({
    resource: [coordinateArray[0], coordinateArray[1]],
    geo: [coordinateArray[2], coordinateArray[3]]
  }))
}

export function parseCoordinateArrayArrayFromFile(file: string): number[][] {
  return parseCoordinatesArrayArray(readFromFile(file))
}

export function parseCoordinatesArrayArray(
  coordinatesString: string
): number[][] {
  // String from mutliline file where each line contains multiple coordinates separated by whitespace
  return coordinatesString
    .trim()
    .split('\n')
    .map((coordinatesLineString) =>
      coordinatesLineString
        .split(/\s+/)
        .map((coordinateString) => Number(coordinateString.trim()))
    )
}

export function parseTransformationType(
  options: {
    annotation?: string
    transformationType: string
    polynomialOrder: number
  },
  map?: GeoreferencedMap
): TransformationType {
  let transformationType
  if (
    options.transformationType === 'polynomial' &&
    options.polynomialOrder === 1
  ) {
    transformationType = 'polynomial1'
  } else if (
    options.transformationType === 'polynomial' &&
    options.polynomialOrder === 2
  ) {
    transformationType = 'polynomial2'
  } else if (
    options.transformationType === 'polynomial' &&
    options.polynomialOrder === 3
  ) {
    transformationType = 'polynomial3'
  } else if (options.transformationType) {
    transformationType = options.transformationType
  } else if (options.annotation && map) {
    transformationType = map.transformation?.type
  } else {
    transformationType = 'polynomial'
  }
  return transformationType
}

export function parseAnnotationValidateMap(
  jsonValue: unknown
): GeoreferencedMap[] | GeoreferencedMap {
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

export function parseAnnotationsValidateMaps(
  jsonValues: unknown[]
): GeoreferencedMap[] {
  const maps = jsonValues.map(parseAnnotationValidateMap).flat()

  return maps
}

export function parseTransformOptions(options: {
  minOffsetRatio?: number
  maxDepth?: number
  destinationIsGeographic?: boolean
  sourceIsGeographic?: boolean
}): Partial<TransformOptions> {
  const transformOptions: Partial<TransformOptions> = {}

  if (options && typeof options === 'object') {
    if ('minOffsetRatio' in options && options.minOffsetRatio) {
      transformOptions.minOffsetRatio = Number(options.minOffsetRatio)
    }

    if ('maxDepth' in options && options.maxDepth) {
      transformOptions.maxDepth = Math.round(Number(options.maxDepth))
    }

    if (
      'destinationIsGeographic' in options &&
      options.destinationIsGeographic
    ) {
      transformOptions.destinationIsGeographic = options.destinationIsGeographic
    }

    if ('sourceIsGeographic' in options && options.sourceIsGeographic) {
      transformOptions.sourceIsGeographic = options.sourceIsGeographic
    }
  }

  return transformOptions
}
