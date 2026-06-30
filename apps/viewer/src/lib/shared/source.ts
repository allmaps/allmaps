import { IIIF } from '@allmaps/iiif-parser'
import { parseAnnotation } from '@allmaps/annotation'
import { fetchAnnotationsFromApi } from '@allmaps/stdlib'
import { generateChecksum } from '@allmaps/id/sync'

import { getAllmapsIdFromUrl } from '$lib/shared/api.js'
import { SourceHttpError, SourceLoadError } from '$lib/shared/source-errors.js'
import {
  formatIssues,
  formatValidationIssuesFromMessage
} from '$lib/shared/validation-error.js'

import type { GeoreferencedMap, PartOfItem } from '@allmaps/annotation'
import type { Canvas } from '@allmaps/iiif-parser'
import type { Manifest } from '@allmaps/iiif-parser'

import type {
  InvalidGeoreferenceAnnotation,
  ParsedSource,
  UrlSource,
  StringSource
} from '$lib/types/shared.js'

type AnnotationPage = {
  id?: string
  type?: string
  items?: unknown[]
}

type AnnotationWithPurpose = {
  motivation?: unknown
  purpose?: unknown
}

type AnnotationParseContext = {
  resource?: GeoreferencedMap['resource']
  canvas?: PartOfItem
  manifest?: PartOfItem
  iiifManifest?: Manifest
}

type ParsedGeoreferenceAnnotations = {
  maps: GeoreferencedMap[]
  invalidAnnotations: InvalidGeoreferenceAnnotation[]
}

type ErrorWithIssues = {
  issues?: unknown
}

function hasGeoreferencingValue(value: unknown) {
  if (typeof value === 'string') {
    return value === 'georeferencing'
  } else if (Array.isArray(value)) {
    return value.some(hasGeoreferencingValue)
  }

  return false
}

function hasGeoreferencingPurpose(annotation: unknown) {
  if (!annotation || typeof annotation !== 'object') {
    return false
  }

  const { motivation, purpose } = annotation as AnnotationWithPurpose

  return hasGeoreferencingValue(motivation) || hasGeoreferencingValue(purpose)
}

function getStringProperty(value: unknown, key: string) {
  if (value && typeof value === 'object' && key in value) {
    const property = value[key as keyof typeof value]

    if (typeof property === 'string') {
      return property
    }
  }
}

function getAnnotationId(annotation: unknown) {
  return (
    getStringProperty(annotation, 'id') ?? getStringProperty(annotation, '@id')
  )
}

function getErrorIssues(error: unknown) {
  const issues = formatIssues(
    error && typeof error === 'object'
      ? (error as ErrorWithIssues).issues
      : undefined
  )

  if (issues.length > 0 || !(error instanceof Error)) {
    return issues
  }

  return formatValidationIssuesFromMessage(error.message)
}

function getErrorMessage(error: unknown) {
  const issues = getErrorIssues(error)
  const firstIssue = issues[0]

  if (firstIssue) {
    return `${firstIssue.message} at ${firstIssue.path}`
  }

  return error instanceof Error
    ? error.message
    : 'Invalid Georeference Annotation'
}

function getAnnotationTargetSource(annotation: unknown) {
  if (
    !annotation ||
    typeof annotation !== 'object' ||
    !('target' in annotation)
  ) {
    return
  }

  const target = annotation.target

  if (!target || typeof target !== 'object' || !('source' in target)) {
    return
  }

  const source = target.source

  return source && typeof source === 'object' ? source : undefined
}

function getManifestPartOfItem(manifest: Manifest): PartOfItem {
  return {
    id: manifest.uri,
    type: 'Manifest',
    label: manifest.label
  }
}

function getCanvasPartOfItem(canvas: Canvas, manifest: Manifest): PartOfItem {
  return {
    id: canvas.uri,
    type: 'Canvas',
    label: canvas.label,
    partOf: [getManifestPartOfItem(manifest)]
  }
}

function getCanvasResource(
  canvas: Canvas,
  manifest: Manifest
): GeoreferencedMap['resource'] {
  return {
    id: canvas.image.uri,
    type: getImageServiceType(canvas.image.majorVersion),
    width: canvas.image.width,
    height: canvas.image.height,
    partOf: [getCanvasPartOfItem(canvas, manifest)]
  }
}

function getAnnotationContext(
  annotation: unknown,
  context: AnnotationParseContext
): AnnotationParseContext {
  if (context.resource || !context.iiifManifest) {
    return context
  }

  const source = getAnnotationTargetSource(annotation)
  const sourceId =
    getStringProperty(source, 'id') ?? getStringProperty(source, '@id')

  if (!sourceId) {
    return context
  }

  const canvas = context.iiifManifest.canvases.find(
    (currentCanvas) => currentCanvas.uri === sourceId
  )

  if (!canvas) {
    return context
  }

  return {
    ...context,
    resource: getCanvasResource(canvas, context.iiifManifest),
    canvas: getCanvasPartOfItem(canvas, context.iiifManifest),
    manifest: getManifestPartOfItem(context.iiifManifest)
  }
}

function createInvalidGeoreferenceAnnotation(
  annotation: unknown,
  error: unknown,
  context: AnnotationParseContext,
  index: number
): InvalidGeoreferenceAnnotation | undefined {
  const annotationContext = getAnnotationContext(annotation, context)
  const { resource } = annotationContext

  if (!resource) {
    return
  }

  const annotationId = getAnnotationId(annotation)
  const validationIssues = getErrorIssues(error)
  const message = getErrorMessage(error)

  return {
    id:
      annotationId ??
      generateChecksum({
        annotation,
        index,
        resourceId: resource.id,
        message
      }),
    annotationId,
    resource,
    canvas: annotationContext.canvas,
    manifest: annotationContext.manifest,
    message,
    validationIssues
  }
}

function parseGeoreferenceAnnotation(
  annotation: unknown,
  context: AnnotationParseContext,
  index: number
): ParsedGeoreferenceAnnotations {
  try {
    return {
      maps: parseAnnotation(annotation),
      invalidAnnotations: []
    }
  } catch (error) {
    const invalidAnnotation = createInvalidGeoreferenceAnnotation(
      annotation,
      error,
      context,
      index
    )

    return {
      maps: [],
      invalidAnnotations: invalidAnnotation ? [invalidAnnotation] : []
    }
  }
}

function emptyGeoreferenceAnnotations(): ParsedGeoreferenceAnnotations {
  return {
    maps: [],
    invalidAnnotations: []
  }
}

function parseGeoreferenceAnnotationPage(
  annotationPage: AnnotationPage,
  context: AnnotationParseContext = {}
): ParsedGeoreferenceAnnotations {
  const annotations = hasGeoreferencingPurpose(annotationPage)
    ? annotationPage.items
    : annotationPage.items?.filter(hasGeoreferencingPurpose)

  if (!annotations || annotations.length === 0) {
    return emptyGeoreferenceAnnotations()
  }

  return annotations.reduce<ParsedGeoreferenceAnnotations>(
    (result, annotation, index) => {
      const parsedAnnotation = parseGeoreferenceAnnotation(
        annotation,
        context,
        index
      )

      result.maps.push(...parsedAnnotation.maps)
      result.invalidAnnotations.push(...parsedAnnotation.invalidAnnotations)

      return result
    },
    emptyGeoreferenceAnnotations()
  )
}

async function fetchAnnotationPage(
  annotationPage: AnnotationPage,
  fetch = globalThis.fetch
) {
  if (annotationPage.items || !annotationPage.id) {
    return annotationPage
  }

  try {
    return (await fetch(annotationPage.id).then((response) =>
      response.json()
    )) as AnnotationPage
  } catch {
    return annotationPage
  }
}

function findPartOfItemsOfType(
  partOfItems: PartOfItem[] | undefined,
  type: PartOfItem['type']
): PartOfItem[] {
  return (partOfItems ?? []).flatMap((partOfItem) => {
    const nestedPartOfItems = findPartOfItemsOfType(partOfItem.partOf, type)

    if (partOfItem.type === type) {
      return [partOfItem, ...nestedPartOfItems]
    }

    return nestedPartOfItems
  })
}

function getMapCanvasIds(map: GeoreferencedMap) {
  const canvasIds = new Set<string>()

  if (map.resource.type === 'Canvas') {
    canvasIds.add(map.resource.id)
  }

  for (const canvas of findPartOfItemsOfType(map.resource.partOf, 'Canvas')) {
    canvasIds.add(canvas.id)
  }

  return canvasIds
}

function addMapCanvasIds(map: GeoreferencedMap, canvasIds: Set<string>) {
  for (const canvasId of getMapCanvasIds(map)) {
    canvasIds.add(canvasId)
  }
}

function addInvalidAnnotationCanvasIds(
  invalidAnnotation: InvalidGeoreferenceAnnotation,
  canvasIds: Set<string>
) {
  if (invalidAnnotation.canvas?.id) {
    canvasIds.add(invalidAnnotation.canvas.id)
  }

  for (const canvas of findPartOfItemsOfType(
    invalidAnnotation.resource.partOf,
    'Canvas'
  )) {
    canvasIds.add(canvas.id)
  }
}

function filterApiMaps(
  apiMaps: GeoreferencedMap[],
  embeddedMaps: GeoreferencedMap[],
  embeddedCanvasIds: Set<string>
) {
  const embeddedMapIds = new Set(
    embeddedMaps.flatMap((map) => (map.id ? [map.id] : []))
  )

  return apiMaps.filter((map) => {
    if (map.id && embeddedMapIds.has(map.id)) {
      return false
    }

    const canvasIds = getMapCanvasIds(map)

    return ![...canvasIds].some((canvasId) => embeddedCanvasIds.has(canvasId))
  })
}

function getImageServiceType(
  majorVersion: number
): GeoreferencedMap['resource']['type'] {
  if (majorVersion === 1) {
    return 'ImageService1'
  } else if (majorVersion === 2) {
    return 'ImageService2'
  } else {
    return 'ImageService3'
  }
}

function normalizeMapResourceForCanvas(
  map: GeoreferencedMap,
  canvas: Canvas,
  manifest: Manifest
): GeoreferencedMap {
  if (map.resource.type !== 'Canvas' || map.resource.id !== canvas.uri) {
    return map
  }

  const canvasPartOfItem = getCanvasPartOfItem(canvas, manifest)

  return {
    ...map,
    resource: {
      ...map.resource,
      ...getCanvasResource(canvas, manifest),
      partOf: [canvasPartOfItem]
    }
  }
}

function normalizeMapResourceForManifest(
  map: GeoreferencedMap,
  manifest: Manifest
): GeoreferencedMap {
  const canvas = manifest.canvases.find(
    (currentCanvas) => currentCanvas.uri === map.resource.id
  )

  if (!canvas) {
    return map
  }

  return normalizeMapResourceForCanvas(map, canvas, manifest)
}

async function parseManifestGeoreferenceAnnotations(
  manifest: Manifest,
  fetch = globalThis.fetch
) {
  const maps: GeoreferencedMap[] = []
  const invalidAnnotations: InvalidGeoreferenceAnnotation[] = []
  const canvasIds = new Set<string>()
  const manifestPartOfItem = getManifestPartOfItem(manifest)

  for (const annotationPage of manifest.annotations ?? []) {
    const fetchedAnnotationPage = await fetchAnnotationPage(
      annotationPage,
      fetch
    )
    const parsedAnnotationPage = parseGeoreferenceAnnotationPage(
      fetchedAnnotationPage,
      {
        manifest: manifestPartOfItem,
        iiifManifest: manifest
      }
    )
    const pageMaps = parsedAnnotationPage.maps.map((map) =>
      normalizeMapResourceForManifest(map, manifest)
    )

    for (const map of pageMaps) {
      addMapCanvasIds(map, canvasIds)
    }

    for (const invalidAnnotation of parsedAnnotationPage.invalidAnnotations) {
      addInvalidAnnotationCanvasIds(invalidAnnotation, canvasIds)
    }

    maps.push(...pageMaps)
    invalidAnnotations.push(...parsedAnnotationPage.invalidAnnotations)
  }

  for (const canvas of manifest.canvases) {
    let canvasHasGeoreferenceAnnotation = false
    const canvasPartOfItem = getCanvasPartOfItem(canvas, manifest)
    const canvasContext = {
      resource: getCanvasResource(canvas, manifest),
      canvas: canvasPartOfItem,
      manifest: manifestPartOfItem,
      iiifManifest: manifest
    }

    for (const annotationPage of canvas.annotations ?? []) {
      const fetchedAnnotationPage = await fetchAnnotationPage(
        annotationPage,
        fetch
      )
      const parsedAnnotationPage = parseGeoreferenceAnnotationPage(
        fetchedAnnotationPage,
        canvasContext
      )
      const pageMaps = parsedAnnotationPage.maps.map((map) =>
        normalizeMapResourceForCanvas(map, canvas, manifest)
      )
      const pageInvalidAnnotations = parsedAnnotationPage.invalidAnnotations

      if (pageMaps.length > 0 || pageInvalidAnnotations.length > 0) {
        canvasHasGeoreferenceAnnotation = true
        for (const map of pageMaps) {
          addMapCanvasIds(map, canvasIds)
        }
        for (const invalidAnnotation of pageInvalidAnnotations) {
          addInvalidAnnotationCanvasIds(invalidAnnotation, canvasIds)
        }
        maps.push(...pageMaps)
        invalidAnnotations.push(...pageInvalidAnnotations)
      }
    }

    if (canvasHasGeoreferenceAnnotation) {
      canvasIds.add(canvas.uri)
    }
  }

  return {
    maps,
    invalidAnnotations,
    canvasIds,
    hasAnnotationsForAllCanvases:
      manifest.canvases.length > 0 &&
      canvasIds.size === manifest.canvases.length
  }
}

async function parseSource(
  annotationsBaseUrl: string,
  json: unknown,
  fetch = globalThis.fetch
): Promise<ParsedSource> {
  if (
    json &&
    typeof json === 'object' &&
    'type' in json &&
    (json.type === 'Annotation' || json.type === 'AnnotationPage')
  ) {
    // json is probably a Georeference Annotation
    const maps = parseAnnotation(json)

    if (maps.length === 0) {
      throw new SourceLoadError('annotation-without-maps')
    }

    return {
      type: 'annotation',
      maps
    }
  } else {
    // json is not a valid Georeference Annotation
    // Try iiif-parser instead
    const parsedIiif = IIIF.parse(json)

    let apiMaps: GeoreferencedMap[] | undefined
    let embeddedMaps: GeoreferencedMap[] | undefined
    let invalidEmbeddedAnnotations: InvalidGeoreferenceAnnotation[] | undefined
    let embeddedCanvasIds = new Set<string>()
    let hasAnnotationsForAllCanvases = false

    if (parsedIiif.type === 'manifest') {
      const manifestGeoreferenceAnnotations =
        await parseManifestGeoreferenceAnnotations(parsedIiif, fetch)

      embeddedMaps = manifestGeoreferenceAnnotations.maps
      invalidEmbeddedAnnotations =
        manifestGeoreferenceAnnotations.invalidAnnotations
      embeddedCanvasIds = manifestGeoreferenceAnnotations.canvasIds
      hasAnnotationsForAllCanvases =
        manifestGeoreferenceAnnotations.hasAnnotationsForAllCanvases
    }

    if (!hasAnnotationsForAllCanvases) {
      try {
        // TODO: rename function... this doesn't fetch annotations, but maps.
        const apiAnnotations = await fetchAnnotationsFromApi(
          annotationsBaseUrl,
          parsedIiif,
          fetch
        )
        const parsedApiMaps = parseAnnotation(apiAnnotations).map((map) =>
          parsedIiif.type === 'manifest'
            ? normalizeMapResourceForManifest(map, parsedIiif)
            : map
        )

        apiMaps = filterApiMaps(
          parsedApiMaps,
          embeddedMaps ?? [],
          embeddedCanvasIds
        )
      } catch {
        // Ignore errors, just return the parsed IIIF data without maps
      }
    }

    if (
      parsedIiif.type === 'manifest' &&
      (embeddedMaps?.length ?? 0) === 0 &&
      (invalidEmbeddedAnnotations?.length ?? 0) === 0 &&
      (apiMaps?.length ?? 0) === 0
    ) {
      throw new SourceLoadError('manifest-without-maps')
    }

    if (parsedIiif.type === 'image' && (apiMaps?.length ?? 0) === 0) {
      throw new SourceLoadError('image-without-maps')
    }

    return {
      type: 'iiif',
      iiif: parsedIiif,
      embeddedMaps,
      invalidEmbeddedAnnotations,
      apiMaps
    }
  }
}

export async function sourceFromUrl(
  annotationsBaseUrl: string,
  url: string,
  fetch = globalThis.fetch
): Promise<UrlSource> {
  const response = await fetch(url)
  let data: unknown

  try {
    data = await response.json()
  } catch (err) {
    if (!response.ok) {
      throw new SourceHttpError(url, response.status, response.statusText, {
        cause: err,
        details: err instanceof Error ? err.message : String(err)
      })
    }

    throw err
  }

  if (!response.ok) {
    throw new SourceHttpError(url, response.status, response.statusText)
  }

  const allmapsId = getAllmapsIdFromUrl(url)

  return {
    sourceType: 'url',
    allmapsId,
    hash: generateChecksum(url),
    url,
    data,
    parsed: await parseSource(annotationsBaseUrl, data, fetch)
  }
}

export async function sourceFromData(
  annotationsBaseUrl: string,
  data: unknown,
  fetch?: typeof globalThis.fetch
): Promise<StringSource> {
  return {
    sourceType: 'string',
    hash: generateChecksum(data),
    data,
    parsed: await parseSource(annotationsBaseUrl, data, fetch)
  }
}
