import { parseAnnotation, validateGeoreferencedMap } from '@allmaps/annotation'

import { InverseOptions } from '@allmaps/transform/shared/types.js'
import { isPoint } from '@allmaps/stdlib'

import { readFromFile, parseJsonFromFile } from './io.js'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type {
  TransformationType,
  TransformationTypeInputs,
  GcpsInputs
} from '@allmaps/transform'
import type { Gcp } from '@allmaps/types'
import type {
  Rcp,
  AttachedTransformationOptions,
  RcpsInput
} from '@allmaps/attach'
import {
  InternalProjectionInputs,
  ProjectedGcpTransformerInputs,
  ProjectedGcpTransformerOptions,
  ProjectedGcpTransformOptions,
  Projection
} from '@allmaps/project'

const mustContainOneMapMessage =
  'Annotation must contain exactly 1 georeferenced map'

export type LaunchOptions = {
  localhost: boolean
  next: boolean
  dev: boolean
}

export function parseMap(options: { annotation?: string }): GeoreferencedMap {
  if (options.annotation) {
    const annotation = parseJsonFromFile(options.annotation)
    const mapOrMaps = parseAnnotationValidateMap(annotation)

    if (Array.isArray(mapOrMaps) && mapOrMaps.length > 1) {
      throw new Error(mustContainOneMapMessage)
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

export function parseGcpInputOptions(
  options: { gcps?: string },
  map?: GeoreferencedMap
): GcpsInputs {
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

  return { gcps }
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

export function parseTransformationTypeInputOptions(
  options: {
    transformationType?: string
    polynomialOrder?: number
  },
  map?: GeoreferencedMap
): TransformationTypeInputs {
  let transformationType: TransformationType
  if (
    options.transformationType === 'polynomial' &&
    (options.polynomialOrder === 1 || options.polynomialOrder === undefined)
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

export function parseInternalProjectionInputOptions(
  options: Partial<{
    internalProjection: string
  }>,
  map?: GeoreferencedMap
): Partial<InternalProjectionInputs> {
  const internalProjectionInputs: Partial<InternalProjectionInputs> = {}

  if (options && typeof options === 'object') {
    if ('internalProjection' in options && options.internalProjection) {
      internalProjectionInputs.internalProjection = {
        definition: options.internalProjection
      } as Projection
    }
  } else if (
    map &&
    map.resourceCrs &&
    typeof map.resourceCrs.definition === 'string'
  ) {
    internalProjectionInputs.internalProjection = map.resourceCrs as Projection
  }

  return internalProjectionInputs
}

export function parseProjectedGcpTransformerInputOptions(
  options: Partial<{
    annotation: string
    gcps: string
    transformationType: string
    polynomialOrder: number
    internalProjection: string
  }>
): ProjectedGcpTransformerInputs {
  let map: GeoreferencedMap | undefined

  try {
    map = parseMap(options)
  } catch (error) {
    if (error instanceof Error && error.message == mustContainOneMapMessage) {
      throw error
    }
    // If no map is found, try parsing GCPs from options instead of a map
  }

  return parseProjectedGcpTransformerInputOptionsAndMap(options, map)
}

export function parseProjectedGcpTransformerInputOptionsAndMap(
  options: Partial<{
    gcps: string
    transformationType: string
    polynomialOrder: number
    internalProjection: string
  }>,
  map?: GeoreferencedMap
): ProjectedGcpTransformerInputs {
  const { gcps } = parseGcpInputOptions(options, map)
  const { transformationType } = parseTransformationTypeInputOptions(
    options,
    map
  )
  const { internalProjection } = parseInternalProjectionInputOptions(
    options,
    map
  )

  return { gcps, transformationType, internalProjection }
}

export function parseProjectedGcpTransformOptions(options: {
  minOffsetRatio?: number
  minOffsetDistance?: number
  minLineDistance?: number
  maxDepth?: number
  geoIsGeographic?: boolean
}): Partial<ProjectedGcpTransformOptions> {
  const partialProjectedGcpTransformOptions: Partial<ProjectedGcpTransformOptions> =
    {}

  if (options && typeof options === 'object') {
    if ('maxDepth' in options && options.maxDepth) {
      partialProjectedGcpTransformOptions.maxDepth = Math.round(
        Number(options.maxDepth)
      )
    }

    if ('minOffsetRatio' in options && options.minOffsetRatio) {
      partialProjectedGcpTransformOptions.minOffsetRatio = Number(
        options.minOffsetRatio
      )
    }

    if ('minOffsetDistance' in options && options.minOffsetDistance) {
      partialProjectedGcpTransformOptions.minOffsetDistance = Number(
        options.minOffsetDistance
      )
    }

    if ('minLineDistance' in options && options.minLineDistance) {
      partialProjectedGcpTransformOptions.minLineDistance = Number(
        options.minLineDistance
      )
    }

    if ('geoIsGeographic' in options && options.geoIsGeographic) {
      partialProjectedGcpTransformOptions.geoIsGeographic =
        options.geoIsGeographic
    }

    if ('projection' in options && options.projection) {
      partialProjectedGcpTransformOptions.projection = {
        definition: options.projection
      } as Projection
    }
  }

  // Note: distortionMeasures and referenceScale not supported, since this would require output processing function
  // Note: Conversion options, i.e. isMultiGeometry, not supported

  return partialProjectedGcpTransformOptions
}

export function parseProjectedGcpTransformerOptions(options: {
  differentHandedness?: boolean
}): Partial<ProjectedGcpTransformerOptions> {
  const partialProjectedGcpTransformerOptions: Partial<ProjectedGcpTransformerOptions> =
    {}

  if (options && typeof options === 'object') {
    if ('noDifferentHandedness' in options && options.noDifferentHandedness) {
      partialProjectedGcpTransformerOptions.differentHandedness =
        !options.noDifferentHandedness
    }
  }

  // Note: Project functions postToGeo and preToResource not supported

  return partialProjectedGcpTransformerOptions
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
  const { transformationType } = parseTransformationTypeInputOptions(options)

  const partialAttachedTransformationOptions: RcpsInput &
    TransformationTypeInputs &
    Partial<AttachedTransformationOptions> = {
    rcps,
    transformationType
  }

  if (options && typeof options === 'object') {
    if ('noAverageOut' in options && options.noAverageOut) {
      partialAttachedTransformationOptions.averageOut = !options.noAverageOut
    }
    if (
      'useMapTransformationTypes' in options &&
      options.useMapTransformationTypes
    ) {
      partialAttachedTransformationOptions.useMapTransformationTypes =
        options.useMapTransformationTypes
    }
    if ('noClone' in options && options.noClone) {
      partialAttachedTransformationOptions.clone = !options.noClone
    }
    if (
      'noEvaluateAttachmentScps' in options &&
      options.noEvaluateAttachmentScps
    ) {
      partialAttachedTransformationOptions.evaluateAttachmentScps =
        !options.noEvaluateAttachmentScps
    }
    if ('evaluateSingleScps' in options && options.evaluateSingleScps) {
      partialAttachedTransformationOptions.evaluateSingleScps =
        options.evaluateSingleScps
    }
    if ('evaluateGcps' in options && options.evaluateGcps) {
      partialAttachedTransformationOptions.evaluateGcps = options.evaluateGcps
    }
    if ('removeExistingGcps' in options && options.removeExistingGcps) {
      partialAttachedTransformationOptions.removeExistingGcps =
        options.removeExistingGcps
    }
  }

  return partialAttachedTransformationOptions
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

export function parseLaunchInputs(
  options: Partial<LaunchOptions>
): Partial<LaunchOptions> {
  const partialLaunchOptions: Partial<LaunchOptions> = {}

  if (options && typeof options === 'object') {
    if ('localhost' in options && options.localhost) {
      partialLaunchOptions.localhost = options.localhost
    }
    if ('next' in options && options.next) {
      partialLaunchOptions.next = options.next
    }
    if ('dev' in options && options.dev) {
      partialLaunchOptions.dev = options.dev
    }
  }

  return partialLaunchOptions
}
