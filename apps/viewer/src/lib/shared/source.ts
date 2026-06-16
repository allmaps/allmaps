import { IIIF } from '@allmaps/iiif-parser'
import { parseAnnotation } from '@allmaps/annotation'
import { fetchAnnotationsFromApi } from '@allmaps/stdlib'
import { generateChecksum } from '@allmaps/id/sync'

import { getAllmapsIdFromUrl } from '$lib/shared/api.js'

import type { GeoreferencedMap, PartOfItem } from '@allmaps/annotation'
import type { Canvas } from '@allmaps/iiif-parser'
import type { Manifest } from '@allmaps/iiif-parser'

import type {
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

function parseGeoreferenceAnnotation(annotation: unknown) {
  try {
    return parseAnnotation(annotation)
  } catch {
    return []
  }
}

function parseGeoreferenceAnnotationPage(annotationPage: AnnotationPage) {
  const annotations = hasGeoreferencingPurpose(annotationPage)
    ? annotationPage.items
    : annotationPage.items?.filter(hasGeoreferencingPurpose)

  if (!annotations || annotations.length === 0) {
    return []
  }

  return annotations.flatMap(parseGeoreferenceAnnotation)
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

function getCanvasPartOfItem(canvas: Canvas, manifest: Manifest): PartOfItem {
  return {
    id: canvas.uri,
    type: 'Canvas',
    label: canvas.label,
    partOf: [
      {
        id: manifest.uri,
        type: 'Manifest',
        label: manifest.label
      }
    ]
  }
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
      id: canvas.image.uri,
      type: getImageServiceType(canvas.image.majorVersion),
      width: canvas.image.width,
      height: canvas.image.height,
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
  const canvasIds = new Set<string>()

  for (const annotationPage of manifest.annotations ?? []) {
    const fetchedAnnotationPage = await fetchAnnotationPage(
      annotationPage,
      fetch
    )
    const pageMaps = parseGeoreferenceAnnotationPage(fetchedAnnotationPage).map(
      (map) => normalizeMapResourceForManifest(map, manifest)
    )

    for (const map of pageMaps) {
      addMapCanvasIds(map, canvasIds)
    }

    maps.push(...pageMaps)
  }

  for (const canvas of manifest.canvases) {
    let canvasHasGeoreferenceAnnotation = false

    for (const annotationPage of canvas.annotations ?? []) {
      const fetchedAnnotationPage = await fetchAnnotationPage(
        annotationPage,
        fetch
      )
      const pageMaps = parseGeoreferenceAnnotationPage(
        fetchedAnnotationPage
      ).map((map) => normalizeMapResourceForCanvas(map, canvas, manifest))

      if (pageMaps.length > 0) {
        canvasHasGeoreferenceAnnotation = true
        for (const map of pageMaps) {
          addMapCanvasIds(map, canvasIds)
        }
        maps.push(...pageMaps)
      }
    }

    if (canvasHasGeoreferenceAnnotation) {
      canvasIds.add(canvas.uri)
    }
  }

  return {
    maps,
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
    let embeddedCanvasIds = new Set<string>()
    let hasAnnotationsForAllCanvases = false

    if (parsedIiif.type === 'manifest') {
      const manifestGeoreferenceAnnotations =
        await parseManifestGeoreferenceAnnotations(parsedIiif, fetch)

      embeddedMaps = manifestGeoreferenceAnnotations.maps
      embeddedCanvasIds = manifestGeoreferenceAnnotations.canvasIds
      hasAnnotationsForAllCanvases =
        manifestGeoreferenceAnnotations.hasAnnotationsForAllCanvases
    }

    if (!hasAnnotationsForAllCanvases) {
      try {
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

    return {
      type: 'iiif',
      iiif: parsedIiif,
      embeddedMaps,
      apiMaps
    }
  }
}

export async function sourceFromUrl(
  annotationsBaseUrl: string,
  url: string,
  fetch = globalThis.fetch
): Promise<UrlSource> {
  const data = await fetch(url).then((response) => response.json())

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
