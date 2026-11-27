import { parseAnnotation } from '@allmaps/annotation'
import { generateId } from '@allmaps/id'
import { IIIF } from '@allmaps/iiif-parser'
import { getGeoreferenceAnnotationItems } from '@allmaps/stdlib'

import type { Image, Manifest } from '@allmaps/iiif-parser'
import type { Handoff } from './urls.ts'

type PublishedGeoreferencing = {
  status: 'georeferenced' | 'partly' | 'contains-georeferencing'
  updatedAt?: string
}

type Georeferencing = PublishedGeoreferencing | { status: 'not-georeferenced' }

type Lookup = Georeferencing | { status: 'unknown' }

export type Resolution =
  | { state: 'ready'; handoff: Handoff; georeferencing: Georeferencing }
  | { state: 'unknown'; source: string }
  | { state: 'unsupported' }

type Options = {
  restBaseUrl: string
  annotationsBaseUrl: string
  signal: AbortSignal
  fetchResource?: typeof fetch
  onResource?: (resource: Image | Manifest) => void
}

function imageInfoUrl(url: URL) {
  const infoUrl = new URL(url)
  infoUrl.pathname = infoUrl.pathname.replace(/\/+$/, '') + '/info.json'
  infoUrl.hash = ''
  return infoUrl
}

async function fetchJson(url: string | URL, fetchResource: typeof fetch) {
  const response = await fetchResource(url)
  if (!response.ok) throw new Error('IIIF lookup failed')
  return (await response.json()) as unknown
}

async function loadIiif(url: string | URL, request: typeof fetch) {
  const json = await fetchJson(url, request)
  if (json && typeof json === 'object') {
    const type =
      'type' in json ? json.type : '@type' in json ? json['@type'] : undefined
    if (
      type === 'Canvas' ||
      type === 'sc:Canvas' ||
      type === 'Collection' ||
      type === 'sc:Collection'
    ) {
      return 'unsupported'
    }
  }
  return IIIF.parse(json)
}

function getUpdateTime(value: unknown) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
    ? value
    : undefined
}

function getPageGeoreferencing(
  page: unknown
): PublishedGeoreferencing | undefined {
  let georeferencing: PublishedGeoreferencing | undefined

  for (const annotation of getGeoreferenceAnnotationItems(page)) {
    try {
      for (const map of parseAnnotation(annotation)) {
        georeferencing ??= { status: 'contains-georeferencing' }
        const updatedAt = getUpdateTime(map.modified ?? map.created)
        if (
          updatedAt &&
          (!georeferencing.updatedAt ||
            Date.parse(updatedAt) > Date.parse(georeferencing.updatedAt))
        ) {
          georeferencing.updatedAt = updatedAt
        }
      }
    } catch {
      // Skip annotations that do not describe a georeferenced map.
    }
  }
  return georeferencing
}

async function checkEmbeddedGeoreferencing(
  manifest: Manifest,
  fetchResource: typeof fetch
): Promise<Lookup> {
  const pages = [
    ...(manifest.annotations ?? []),
    ...manifest.canvases.flatMap((canvas) => canvas.annotations ?? [])
  ]
  for (const page of pages) {
    const georeferencing = getPageGeoreferencing(page)
    if (georeferencing) return georeferencing
  }

  let incomplete = false
  for (const page of pages) {
    if (page.items) continue
    try {
      const linkedPage = await fetchJson(page.id, fetchResource)
      if (
        !linkedPage ||
        typeof linkedPage !== 'object' ||
        !('items' in linkedPage) ||
        !Array.isArray(linkedPage.items)
      ) {
        incomplete = true
      } else {
        const georeferencing = getPageGeoreferencing(linkedPage)
        if (georeferencing) return georeferencing
      }
    } catch {
      incomplete = true
    }
  }
  return { status: incomplete ? 'unknown' : 'not-georeferenced' }
}

function getIndexStatus(
  response: object,
  type: 'image' | 'manifest'
): Lookup['status'] {
  if (type === 'image') {
    if ('georeferenced' in response) {
      if (response.georeferenced === true) return 'georeferenced'
      if (response.georeferenced === false) return 'not-georeferenced'
    }
    return 'unknown'
  }

  if (
    !('canvasCount' in response) ||
    !('georeferencedCanvasCount' in response)
  ) {
    return 'unknown'
  }

  const { canvasCount, georeferencedCanvasCount } = response

  if (
    typeof georeferencedCanvasCount !== 'number' ||
    !Number.isSafeInteger(georeferencedCanvasCount) ||
    georeferencedCanvasCount < 0 ||
    (canvasCount !== null &&
      (typeof canvasCount !== 'number' ||
        !Number.isSafeInteger(canvasCount))) ||
    georeferencedCanvasCount > (canvasCount ?? 0)
  ) {
    return 'unknown'
  }

  if (georeferencedCanvasCount === 0) return 'not-georeferenced'
  return georeferencedCanvasCount === canvasCount ? 'georeferenced' : 'partly'
}

async function checkIndex(
  url: URL,
  type: 'image' | 'manifest',
  fetchResource: typeof fetch
): Promise<Lookup> {
  try {
    const response = await fetchJson(url, fetchResource)
    if (!response || typeof response !== 'object') {
      return { status: 'unknown' }
    }

    const status = getIndexStatus(response, type)
    if (status === 'unknown' || status === 'not-georeferenced') {
      return { status }
    }

    const updatedAt =
      'georeferencingUpdatedAt' in response
        ? getUpdateTime(response.georeferencingUpdatedAt)
        : undefined
    return { status, ...(updatedAt ? { updatedAt } : {}) }
  } catch {
    return { status: 'unknown' }
  }
}

export async function resolveResource(
  resourceUrl: URL,
  {
    restBaseUrl,
    annotationsBaseUrl,
    signal,
    fetchResource = fetch,
    onResource
  }: Options
): Promise<Resolution> {
  const request: typeof fetch = (url) =>
    fetchResource(url, {
      credentials: 'omit',
      referrerPolicy: 'strict-origin',
      signal
    })
  const infoUrl = resourceUrl.pathname.endsWith('/info.json')
    ? resourceUrl
    : imageInfoUrl(resourceUrl)

  let source = resourceUrl.href
  try {
    let iiif: Awaited<ReturnType<typeof loadIiif>>
    try {
      iiif = await loadIiif(source, request)
    } catch (error) {
      if (source === infoUrl.href || signal.aborted) throw error
      iiif = await loadIiif(infoUrl, request)
      source = infoUrl.href
    }
    if (iiif === 'unsupported' || iiif.type === 'collection')
      return { state: 'unsupported' }

    onResource?.(iiif)

    if (iiif.type === 'image') {
      source = infoUrl.href
    }

    const id = await generateId(iiif.uri)
    const path = '/' + iiif.type + 's/' + id
    const indexed = checkIndex(
      new URL(path + '/georeferenced', restBaseUrl),
      iiif.type,
      request
    )
    const embedded =
      iiif.type === 'manifest'
        ? checkEmbeddedGeoreferencing(iiif, request)
        : Promise.resolve<Lookup>({ status: 'not-georeferenced' })

    try {
      const { viewerSource, georeferencing } = await Promise.any(
        [
          {
            lookup: indexed,
            viewerSource: new URL(path, annotationsBaseUrl).href
          },
          { lookup: embedded, viewerSource: source }
        ].map(async ({ lookup, viewerSource }) => {
          const georeferencing = await lookup
          if (
            georeferencing.status !== 'unknown' &&
            georeferencing.status !== 'not-georeferenced'
          ) {
            return { viewerSource, georeferencing }
          }
          throw new Error('Georeferencing not confirmed')
        })
      )

      return {
        state: 'ready',
        handoff: { destination: 'viewer', source: viewerSource },
        georeferencing
      }
    } catch {
      const results = await Promise.all([indexed, embedded])
      if (results.every((result) => result.status === 'not-georeferenced')) {
        return {
          state: 'ready',
          handoff: { destination: 'editor', source },
          georeferencing: { status: 'not-georeferenced' }
        }
      }
    }
    return { state: 'unknown', source }
  } catch {
    return { state: 'unknown', source: resourceUrl.href }
  }
}
