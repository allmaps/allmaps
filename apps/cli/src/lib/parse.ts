import { parseAnnotation, validateGeoreferencedMap } from '@allmaps/annotation'

import { InverseOptions } from '@allmaps/transform/shared/types.js'
import { isPoint } from '@allmaps/stdlib'

import { readFromFile, parseJsonFromFile } from './io.js'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type {
  TransformationType,
  TransformerInputs,
  GcpTransformerOptions,
  GcpTransformOptions,
  TransformationTypeInputs
} from '@allmaps/transform'
import type { Gcp } from '@allmaps/types'
import type {
  Rcp,
  AttachedTransformationOptions,
  RcpsInput
} from '@allmaps/attach'

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
    return validateGeoreferencedMap(jsonValue)
  }
}

export function parseAnnotationsValidateMaps(
  jsonValues: unknown[]
): GeoreferencedMap[] {
  const maps = jsonValues.map(parseAnnotationValidateMap).flat()

  return maps
}

export function parseGcps(
  options: { gcps?: string },
  map?: GeoreferencedMap
): Gcp[] {
  let gcps: Gcp[]
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

export function parseTransformationTypeInputs(
  options: {
    transformationType?: string
    polynomialOrder?: number
  },
  map?: GeoreferencedMap
): TransformationTypeInputs {
  let transformationType: TransformationType
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
  } else if (options.transformationType === 'thinPlateSpline') {
    transformationType = options.transformationType
  } else if (options.transformationType === 'linear') {
    transformationType = options.transformationType
  } else if (options.transformationType === 'helmert') {
    transformationType = options.transformationType
  } else if (options.transformationType === 'projective') {
    transformationType = options.transformationType
  } else if (map && map.transformation) {
    transformationType = map.transformation.type
  } else {
    transformationType = 'polynomial'
  }

  return { transformationType }
}

export function parseTransformerInputs(
  options: Partial<{
    annotation: string
    gcps: string
    transformationType: string
    polynomialOrder: number
  }>
): TransformerInputs {
  let map: GeoreferencedMap | undefined

  try {
    map = parseMap(options)
  } catch {
    // If no map is found, try parsing GCPs from options instead of a map
  }

  const gcps = parseGcps(options, map)
  const { transformationType } = parseTransformationTypeInputs(options, map)

  return { gcps, transformationType }
}

export function parseTransformOptions(options: {
  minOffsetRatio?: number
  minOffsetDistance?: number
  minLineDistance?: number
  maxDepth?: number
  geoIsGeographic?: boolean
}): Partial<GcpTransformOptions> {
  const transformOptions: Partial<GcpTransformOptions> = {}

  if (options && typeof options === 'object') {
    if ('maxDepth' in options && options.maxDepth) {
      transformOptions.maxDepth = Math.round(Number(options.maxDepth))
    }

    if ('minOffsetRatio' in options && options.minOffsetRatio) {
      transformOptions.minOffsetRatio = Number(options.minOffsetRatio)
    }

    if ('minOffsetDistance' in options && options.minOffsetDistance) {
      transformOptions.minOffsetDistance = Number(options.minOffsetDistance)
    }

    if ('minLineDistance' in options && options.minLineDistance) {
      transformOptions.minLineDistance = Number(options.minLineDistance)
    }

    if ('geoIsGeographic' in options && options.geoIsGeographic) {
      transformOptions.geoIsGeographic = options.geoIsGeographic
    }
  }

  // Note: distortionMeasures and referenceScale not supported, since this would require output processing function
  // Note: Conversion options, i.e. isMultiGeometry, not supported

  return transformOptions
}

export function parseTransformerOptions(options: {
  differentHandedness?: boolean
}): Partial<GcpTransformerOptions> {
  const transformerOptions: Partial<GcpTransformerOptions> = {}

  if (options && typeof options === 'object') {
    if ('differentHandedness' in options && options.differentHandedness) {
      transformerOptions.differentHandedness = options.differentHandedness
    }
  }

  // Note: Project functions postToGeo and preToResource not supported

  return transformerOptions
}

export function parseRcps(options: { rcps?: string }): Rcp[] {
  if (options.rcps) {
    const rcps = parseJsonFromFile(options.rcps)

    if (
      Array.isArray(rcps) &&
      rcps.every(
        (rcp) =>
          typeof rcp === 'object' &&
          'type' in rcp &&
          rcp.type === 'rcp' &&
          'id' in rcp &&
          typeof rcp.id == 'string' &&
          'mapId' in rcp &&
          typeof rcp.mapId == 'string' &&
          'resource' in rcp &&
          isPoint(rcp.resource)
      )
    ) {
      return rcps as Rcp[]
    } else {
      throw new Error('RCPs must be of the correct type')
    }
  }

  throw new Error('No RCPs supplied')
}

export function parseAttachInputs(
  options: Partial<{
    rcps: string
    transformationType: string
    averageOut: boolean
    useMapTransformationTypes: boolean
    clone: boolean
    evaluateAttachmentScps: boolean
    evaluateSingleScps: boolean
    evaluateGcps: boolean
    removeExistingGcps: boolean
  }>
): RcpsInput &
  TransformationTypeInputs &
  Partial<AttachedTransformationOptions> {
  const rcps = parseRcps(options)
  const { transformationType } = parseTransformationTypeInputs(options)

  const attachedTransformationOptions: RcpsInput &
    TransformationTypeInputs &
    Partial<AttachedTransformationOptions> = {
    rcps,
    transformationType
  }

  if (options && typeof options === 'object') {
    if ('noAverageOut' in options && options.noAverageOut) {
      attachedTransformationOptions.averageOut = !options.noAverageOut
    }
    if (
      'useMapTransformationTypes' in options &&
      options.useMapTransformationTypes
    ) {
      attachedTransformationOptions.useMapTransformationTypes =
        options.useMapTransformationTypes
    }
    if ('noClone' in options && options.noClone) {
      attachedTransformationOptions.clone = !options.noClone
    }
    if (
      'noEvaluateAttachmentScps' in options &&
      options.noEvaluateAttachmentScps
    ) {
      attachedTransformationOptions.evaluateAttachmentScps =
        !options.noEvaluateAttachmentScps
    }
    if ('evaluateSingleScps' in options && options.evaluateSingleScps) {
      attachedTransformationOptions.evaluateSingleScps =
        options.evaluateSingleScps
    }
    if ('evaluateGcps' in options && options.evaluateGcps) {
      attachedTransformationOptions.evaluateGcps = options.evaluateGcps
    }
    if ('removeExistingGcps' in options && options.removeExistingGcps) {
      attachedTransformationOptions.removeExistingGcps =
        options.removeExistingGcps
    }
  }

  return attachedTransformationOptions
}

export function parseInverseOptions(options: {
  inverse?: boolean
}): Partial<InverseOptions> {
  const transformOptions: Partial<InverseOptions> = {}

  if ('inverse' in options && options.inverse) {
    transformOptions.inverse = options.inverse
  }

  return transformOptions
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
