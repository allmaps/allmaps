import { parseAnnotation, validateGeoreferencedMap } from '@allmaps/annotation'

import {
  InverseOptions,
  transformationTypeToTypeAndOrder,
  typeAndOrderToTransformationType
} from '@allmaps/transform'
import {
  isPoint,
  isRing,
  mergeOptionsUnlessUndefined,
  stringToSvgGeometriesGenerator,
  svgGeometryToGeometry
} from '@allmaps/stdlib'
import {
  parseGcps,
  parseInternalProjectionFromGcpString,
  parseGdalCoordinateLines,
  GcpFileType,
  gcpFileTypes
} from '@allmaps/io'

import { readFromFile, parseJsonFromFile } from './io.js'

import type { GeoreferencedMap } from '@allmaps/annotation'
import type {
  TransformationType,
  TransformationTypeInputs as TransformationTypeInputOptions,
  GcpsInputs as GcpsInputOptions
} from '@allmaps/transform'
import type { Gcp, Ring } from '@allmaps/types'
import type {
  Rcp,
  AttachedTransformationOptions,
  RcpsInput
} from '@allmaps/attach'
import {
  InternalProjectionInputs as InternalProjectionInputOptions,
  ProjectedGcpTransformerInputs as ProjectedGcpTransformerInputOptions,
  ProjectedGcpTransformerOptions,
  ProjectedGcpTransformOptions,
  Projection
} from '@allmaps/project'

export const mustContainOneMapMessage =
  'Annotation must contain exactly 1 georeferenced map'
export const mustContainGcpsMessage =
  'No GCPs supplied. Supply a Georeference Annotation or a file containing GCPs.'
export const mustContainTransformationTypeMessage =
  'No transformation type supplied.'

export type AnnotationInputOptions = {
  resourceId: string
  resourceType: string
  resourceWidth: number
  resourceHeight: number
  resourceMask: Ring
} & ProjectedGcpTransformerInputOptions

export type LaunchOptions = {
  localhost: boolean
  next: boolean
  dev: boolean
}

export function parseMap(annotation?: string): GeoreferencedMap {
  if (annotation) {
    const mapOrMaps = parseAnnotationValidateMap(parseJsonFromFile(annotation))

    if (Array.isArray(mapOrMaps) && mapOrMaps.length > 1) {
      throw new Error(mustContainOneMapMessage)
    }
    const map = Array.isArray(mapOrMaps) ? mapOrMaps[0] : mapOrMaps
    return map
  }

  throw new Error('No Georeference Annotation supplied')
}

export function parseAnnotationsValidateMaps(
  jsonValues: unknown[],
  annotationInputs?: Partial<AnnotationInputOptions>
): GeoreferencedMap[] {
  const maps = jsonValues
    .map((jsonValue) => parseAnnotationValidateMap(jsonValue, annotationInputs))
    .flat()

  return maps
}

export function parseAnnotationValidateMap(
  jsonValue: unknown,
  annotationInputs?: Partial<AnnotationInputOptions>
): GeoreferencedMap[] | GeoreferencedMap {
  let mapOrMaps
  if (
    jsonValue &&
    typeof jsonValue === 'object' &&
    'type' in jsonValue &&
    (jsonValue.type === 'Annotation' || jsonValue.type === 'AnnotationPage')
  ) {
    mapOrMaps = parseAnnotation(jsonValue)
  } else {
    mapOrMaps = validateGeoreferencedMap(jsonValue)
  }
  mapOrMaps = mergeAnnotationInputsInMapOrMaps(mapOrMaps, annotationInputs)
  return mapOrMaps
}

export function mergeAnnotationInputsInMapOrMaps(
  mapOrMaps: GeoreferencedMap | GeoreferencedMap[],
  annotationInputs?: Partial<AnnotationInputOptions>
): GeoreferencedMap | GeoreferencedMap[] {
  if (Array.isArray(mapOrMaps)) {
    return mapOrMaps.map((map) =>
      mergeAnnotationInputsInMap(map, annotationInputs)
    )
  } else {
    return mergeAnnotationInputsInMap(mapOrMaps, annotationInputs)
  }
}

export function mergeAnnotationInputsInMap(
  map: GeoreferencedMap,
  annotationInputs?: Partial<AnnotationInputOptions>
): GeoreferencedMap {
  // Merge object-properties: resource, transformation, ...
  map.resource = mergeOptionsUnlessUndefined(map.resource, {
    id: annotationInputs?.resourceId,
    type: annotationInputs?.resourceType,
    width: annotationInputs?.resourceWidth,
    height: annotationInputs?.resourceHeight
  })

  const transformationTypeAndOrder = mergeOptionsUnlessUndefined(
    map.transformation ?? { type: undefined },
    transformationTypeToTypeAndOrder(annotationInputs?.transformationType)
  )
  if (transformationTypeAndOrder.type !== undefined) {
    map.transformation = transformationTypeAndOrder
  }

  // Merge other properties
  mergeOptionsUnlessUndefined(map, {
    resourceMask: annotationInputs?.resourceMask,
    gcps: annotationInputs?.gcps,
    resourceCrs: annotationInputs?.internalProjection
  })
  return map
}

export function parseAnnotationInputOptions(
  options: Partial<{
    resourceId: string
    resourceType: string
    resourceWidth: number
    resourceHeight: number
    resourceMask: string
    annotation: string
    gcps: string
    transformationType: string
    polynomialOrder: number
    internalProjectionDefinition: string
  }>
): Partial<AnnotationInputOptions> {
  const {
    resourceId,
    resourceType,
    resourceWidth,
    resourceHeight,
    resourceMask: resourceMaskString
  } = options
  const svgGeometry = resourceMaskString
    ? stringToSvgGeometriesGenerator(resourceMaskString).next()
    : undefined
  let resourceMask
  if (svgGeometry && svgGeometry.value) {
    resourceMask = svgGeometryToGeometry(svgGeometry.value)
    if (!isRing(resourceMask)) {
      throw new Error('ResourceMask should be a ring')
    }
  }
  const { gcps, transformationType, internalProjection } =
    parseProjectedGcpTransformerInputOptions(options)

  return {
    resourceId,
    resourceType,
    resourceWidth,
    resourceHeight,
    resourceMask,
    transformationType,
    internalProjection,
    gcps
  }
}

export function parseProjectedGcpTransformerInputOptions(
  options: Partial<{
    annotation: string
    gcps: string
    transformationType: string
    polynomialOrder: number
    internalProjectionDefinition: string
    resourceHeight: number
  }>
): Partial<ProjectedGcpTransformerInputOptions> {
  let map: GeoreferencedMap | undefined

  try {
    map = parseMap(options.annotation)
  } catch (error) {
    if (error instanceof Error && error.message == mustContainOneMapMessage) {
      throw error
    }
    // If no map is found, try parsing GCPs and co from options instead of from map
  }

  return parseProjectedGcpTransformerInputOptionsAndMap(options, map)
}

export function parseProjectedGcpTransformerInputOptionsAndMap(
  options: Partial<{
    gcps: string
    transformationType: string
    polynomialOrder: number
    internalProjectionDefinition: string
    resourceHeight: number
  }>,
  map?: GeoreferencedMap
): Partial<ProjectedGcpTransformerInputOptions> {
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

export function parseGcpInputOptions(
  options: Partial<{
    gcps: string
    resourceHeight: number
  }>,
  map?: GeoreferencedMap
): Partial<GcpsInputOptions> {
  let gcps: Gcp[]
  if (options.gcps) {
    try {
      // The GCP option was provided by another georeferenced map
      gcps = parseMap(options.gcps).gcps
    } catch (e) {
      // The GCP option was provided by a file with GCPs
      const gcpString = readFromFile(options.gcps)
      gcps = parseGcps(gcpString, options).gcps
    }
    return { gcps }
  } else if (map) {
    // Use the GCPs already from the already parsed annotation
    gcps = map.gcps
    return { gcps }
  }
  return {}
}

export function parseCoordinates(coordinates: string): number[][] {
  const lines = coordinates.trim().split('\n')

  if (lines.length == 0) {
    throw new Error('No coordinates')
  }

  return parseGdalCoordinateLines(lines)
}

export function parseTransformationTypeInputOptions(
  options: {
    transformationType?: string
    polynomialOrder?: number
  },
  map?: GeoreferencedMap
): Partial<TransformationTypeInputOptions> {
  let transformationType: TransformationType
  if (options.transformationType) {
    const transformationType = typeAndOrderToTransformationType({
      type: options.transformationType,
      options: { order: options.polynomialOrder }
    })
    return { transformationType }
  } else if (map && map.transformation) {
    transformationType = map.transformation.type
    return { transformationType }
  }

  return {}
}

export function parseInternalProjectionInputOptions(
  options: Partial<{
    gcps?: string
    internalProjectionDefinition: string
  }>,
  map?: GeoreferencedMap
): Partial<InternalProjectionInputOptions> {
  const internalProjectionInputs: Partial<InternalProjectionInputOptions> = {}

  if (
    options &&
    typeof options === 'object' &&
    'internalProjectionDefinition' in options &&
    options.internalProjectionDefinition
  ) {
    internalProjectionInputs.internalProjection = {
      definition: options.internalProjectionDefinition
    } as Projection
  } else if (
    options &&
    typeof options === 'object' &&
    'gcps' in options &&
    options.gcps
  ) {
    const gcpString = readFromFile(options.gcps)
    internalProjectionInputs.internalProjection =
      parseInternalProjectionFromGcpString(gcpString)
  } else if (
    map &&
    map.resourceCrs &&
    typeof map.resourceCrs.definition === 'string'
  ) {
    internalProjectionInputs.internalProjection = map.resourceCrs as Projection
  }

  return internalProjectionInputs
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

    if ('projectionDefinition' in options && options.projectionDefinition) {
      partialProjectedGcpTransformOptions.projection = {
        definition: options.projectionDefinition
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
  Partial<TransformationTypeInputOptions> &
  Partial<AttachedTransformationOptions> {
  const rcps = parseRcps(options)
  const { transformationType } = parseTransformationTypeInputOptions(options)

  const partialAttachedTransformationOptions: RcpsInput &
    Partial<TransformationTypeInputOptions> &
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

export function parseGcpFileTypeOptions(options?: { gcpFileType?: string }): {
  gcpFileType: GcpFileType
} {
  if (
    options &&
    options.gcpFileType &&
    gcpFileTypes.includes(options.gcpFileType)
  ) {
    return { gcpFileType: options.gcpFileType as GcpFileType }
  } else {
    throw new Error(
      `Unrecognised GCP file type. Allowed types are ${gcpFileTypes.join(', ')}`
    )
  }
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
