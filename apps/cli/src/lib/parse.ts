import { parseAnnotation, validateGeoreferencedMap } from '@allmaps/annotation'

import {
  InverseOptions,
  transformationTypeToTypeAndOrder,
  typeAndOrderToTransformationType
} from '@allmaps/transform'
import {
  isPoint,
  isRing,
  mergeOptions,
  mergeOptionsUnlessUndefined,
  stringToSvgGeometriesGenerator,
  svgGeometryToGeometry
} from '@allmaps/stdlib'
import {
  parseGcps,
  parseGcpProjectionFromGcpString,
  parseGdalCoordinateLines,
  GcpFileFormat,
  supportedGcpFileFormats,
  GcpResourceOrigin,
  GcpResourceYAxis,
  supportedGcpResourceYAxis,
  supportedGcpResourceOrigin
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
import type {
  InternalProjectionInputs as InternalProjectionInputOptions,
  ProjectionInputs as ProjectionInputOptions,
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
} & ProjectedGcpTransformerInputOptions &
  GcpProjectionInputOptions
export type GcpProjectionInputOptions = {
  gcpProjection: Projection
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
    resourceCrs:
      annotationInputs?.internalProjection ?? annotationInputs?.gcpProjection
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
    gcpFileFormat: GcpFileFormat
    gcpResourceWidth: number
    gcpResourceHeight: number
    gcpResourceOrigin: GcpResourceOrigin
    gcpResourceYAxis: GcpResourceYAxis
    gcpProjectionDefinition: string
    transformationType: string
    polynomialOrder: number
    internalProjectionDefinition: string
    projectionDefinition: string
  }>
): Partial<AnnotationInputOptions> {
  const {
    resourceId,
    resourceType,
    resourceWidth,
    resourceHeight,
    resourceMask: resourceMaskString
  } = options
  // TODO: consider using parse functions from @allmaps/annotation
  // TODO: parse resourceId: remove trailing '/'
  // TODO: fix parsing SVG
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

  const {
    gcps,
    gcpProjection,
    transformationType,
    internalProjection,
    projection
  } = parseProjectedGcpTransformerInputOptions(options)

  return {
    resourceId,
    resourceType,
    resourceWidth,
    resourceHeight,
    resourceMask,
    transformationType,
    internalProjection,
    projection,
    gcps,
    gcpProjection
  }
}

export function parseProjectedGcpTransformerInputOptions(
  options: Partial<{
    annotation: string
    gcps: string
    gcpFileFormat: GcpFileFormat
    gcpResourceWidth: number
    gcpResourceHeight: number
    gcpResourceOrigin: GcpResourceOrigin
    gcpResourceYAxis: GcpResourceYAxis
    gcpProjectionDefinition: string
    transformationType: string
    polynomialOrder: number
    internalProjectionDefinition: string
    projectionDefinition: string
    resourceWidth: number
    resourceHeight: number
  }>
): Partial<ProjectedGcpTransformerInputOptions & GcpProjectionInputOptions> {
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
    gcpResourceWidth: number
    gcpResourceHeight: number
    gcpResourceOrigin: GcpResourceOrigin
    gcpResourceYAxis: GcpResourceYAxis
    gcpProjectionDefinition: string
    transformationType: string
    polynomialOrder: number
    internalProjectionDefinition: string
    projectionDefinition: string
    resourceWidth: number
    resourceHeight: number
  }>,
  map?: GeoreferencedMap
): Partial<ProjectedGcpTransformerInputOptions & GcpProjectionInputOptions> {
  const { gcps, gcpProjection } = parseGcpInputOptions(options, map)
  const { transformationType } = parseTransformationTypeInputOptions(
    options,
    map
  )
  const { internalProjection } = parseInternalProjectionInputOptions(
    options,
    map
  )
  const { projection } = parseProjectionInputOptions(options)

  return {
    gcps,
    gcpProjection,
    transformationType,
    internalProjection,
    projection
  }
}

export function parseGcpInputOptions(
  options: Partial<{
    gcps: string
    gcpResourceWidth: number
    gcpResourceHeight: number
    gcpResourceOrigin: GcpResourceOrigin
    gcpResourceYAxis: GcpResourceYAxis
    gcpProjectionDefinition: string
    resourceWidth: number
    resourceHeight: number
  }>,
  map?: GeoreferencedMap
): Partial<GcpsInputOptions & GcpProjectionInputOptions> {
  let gcps: Gcp[]
  const { gcpProjection } = parseGcpProjectionInputOptions(options)

  if (options.gcps) {
    try {
      // The GCP option was provided by another georeferenced map
      gcps = parseMap(options.gcps).gcps
      return { gcps, gcpProjection }
    } catch (e) {
      // The GCP option was provided by a file with GCPs
      const gcpString = readFromFile(options.gcps)
      gcps = parseGcps(gcpString, mergeOptions(options, { gcpProjection })).gcps
      return { gcps, gcpProjection }
    }
  } else if (map) {
    // Use the GCPs already from the already parsed annotation
    gcps = map.gcps
    return { gcps, gcpProjection }
  }
  return { gcpProjection }
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
      parseGcpProjectionFromGcpString(gcpString)
  } else if (
    map &&
    map.resourceCrs &&
    typeof map.resourceCrs.definition === 'string'
  ) {
    internalProjectionInputs.internalProjection = map.resourceCrs as Projection
  }

  return internalProjectionInputs
}

export function parseProjectionInputOptions(
  options: Partial<{
    projectionDefinition: string
  }>
): Partial<ProjectionInputOptions> {
  const projectionInputs: Partial<ProjectionInputOptions> = {}

  if (
    options &&
    typeof options === 'object' &&
    'projectionDefinition' in options &&
    options.projectionDefinition
  ) {
    projectionInputs.projection = {
      definition: options.projectionDefinition
    } as Projection
  }

  return projectionInputs
}

export function parseGcpProjectionInputOptions(
  options: Partial<{
    gcpProjectionDefinition: string
  }>
): Partial<{ gcpProjection: Projection }> {
  const gcpProjectionInputs: Partial<{ gcpProjection: Projection }> = {}

  if (
    options &&
    typeof options === 'object' &&
    'gcpProjectionDefinition' in options &&
    options.gcpProjectionDefinition
  ) {
    gcpProjectionInputs.gcpProjection = {
      definition: options.gcpProjectionDefinition
    } as Projection
  }

  return gcpProjectionInputs
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
          typeof rcp.id === 'string' &&
          'mapId' in rcp &&
          typeof rcp.mapId === 'string' &&
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

export function parseCommanderGcpFileFormatOption(
  string: string
): GcpFileFormat {
  if (supportedGcpFileFormats.includes(string)) {
    return string as GcpFileFormat
  } else {
    throw new Error(
      `Unsupported GCP file format. Supported formats are ${supportedGcpFileFormats.join(', ')}`
    )
  }
}

export function parseCommanderGcpResourceOrigin(
  string: string
): GcpResourceOrigin {
  if (supportedGcpResourceOrigin.includes(string)) {
    return string as GcpResourceOrigin
  } else {
    throw new Error(
      `Unsupported GCP resource origin. Supported formats are ${supportedGcpResourceOrigin.join(', ')}`
    )
  }
}

export function parseCommanderGcpResourceYAxis(
  string: string
): GcpResourceYAxis {
  if (supportedGcpResourceYAxis.includes(string)) {
    return string as GcpResourceYAxis
  } else {
    throw new Error(
      `Unsupported GCP resource y axis. Supported formats are ${supportedGcpResourceYAxis.join(', ')}`
    )
  }
}
