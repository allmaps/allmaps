import { generateChecksum, generateId } from '@allmaps/id'
import { fetchJson } from '@allmaps/stdlib'

import type { Manifest } from '@allmaps/iiif-parser'
import type { Source } from '../types/shared.js'

export async function fetchMaps(apiBaseUrl: string, source: Source) {
  const url = `${apiBaseUrl}/${source.type}s/${source.allmapsId}/maps`
  return await fetchJson(url)
}

export async function checkSource(apiBaseUrl: string, source: Source) {
  const url = `${apiBaseUrl}/${source.type}s/${source.allmapsId}`
  return await fetchJson(url)
}

export async function createSource(apiBaseUrl: string, source: Source) {
  if (source.type === 'collection') {
    console.warn("Don't create collection sources via API.")
    return
  }

  const apiUrl = `${apiBaseUrl}/${source.type}s/${source.allmapsId}`
  const response = await putSource(apiUrl, source.url, source.sourceIiif)
  return await response.json()
}

async function putSource(apiUrl: string, url: string, sourceIiif: unknown) {
  const checksum = await generateChecksum(sourceIiif)
  return fetch(apiUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, checksum })
  })
}

type ManifestRecord = {
  canvases: {
    uri: string
    images: { uri: string }[]
    imageServicesIndexed?: boolean
  }[]
}

function readManifestRecord(response: Response): Promise<ManifestRecord> {
  if (!response.ok)
    throw new Error(`Could not resolve manifest (${response.status})`)
  return response.json()
}

export async function fetchManifestRecord(
  apiBaseUrl: string,
  manifest: Manifest,
  sourceUrl = manifest.uri
) {
  const apiUrl = `${apiBaseUrl}/manifests/${await generateId(manifest.uri)}`
  const multiServiceCanvases = manifest.canvases.filter(
    (canvas) => canvas.image.serviceUris.length > 1
  )
  const response = await fetch(
    apiUrl,
    multiServiceCanvases.length ? { cache: 'no-store' } : undefined
  )
  if (response.status !== 404) {
    const record = await readManifestRecord(response)
    if (!multiServiceCanvases.length) return record
    const indexed = new Set(
      record.canvases
        .filter((canvas) => canvas.imageServicesIndexed)
        .map((canvas) => canvas.uri)
    )
    if (multiServiceCanvases.every((canvas) => indexed.has(canvas.uri)))
      return record
  }
  return readManifestRecord(await putSource(apiUrl, sourceUrl, manifest.source))
}

export async function resolveEditorImage(
  apiBaseUrl: string,
  uri: string,
  signal?: AbortSignal
) {
  const url = `${uri}/info.json`
  const endpoint = `${apiBaseUrl}/images/${await generateId(uri)}`
  const response = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, resolve: true }),
    signal
  })
  if (!response.ok) {
    const message = (await response.json().catch(() => undefined))?.error
    throw new Error(message ?? `Image resolution failed (${response.status})`)
  }
  return (await response.json()) as { uri: string; data: unknown }
}
