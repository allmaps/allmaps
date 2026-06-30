import { generateAnnotation } from '@allmaps/annotation'

import { getCanonicalManifest } from '$lib/shared/iiif.js'

import type { GeoreferencedMap } from '@allmaps/annotation'

export type View = 'map' | 'image'

export type MapAnnotationSource = 'allmaps' | 'embedded' | 'external'

function getImageServiceId(map: GeoreferencedMap) {
  return map.resource.id.replace(/\/info\.json$/, '').replace(/\/$/, '')
}

function isHttpUrl(value?: string) {
  if (!value) {
    return false
  }

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function getMapEditorUrl(map: GeoreferencedMap) {
  const manifest = getCanonicalManifest(map)
  const imageServiceId = getImageServiceId(map)
  const params = new URLSearchParams()

  if (manifest) {
    params.set('url', manifest.id)
    params.set('image', imageServiceId)
  } else {
    params.set('url', `${imageServiceId}/info.json`)
  }

  return `https://editor.allmaps.org/mask?${params.toString()}`
}

export function getAllmapsAnnotationMapId(mapId?: string) {
  if (!mapId) {
    return
  }

  const match = /(?:^|\/)maps\/([a-zA-Z0-9]{16})(?:@[^/]+)?(?:\.json)?$/.exec(
    mapId
  )

  return match?.[1]
}

export function getAllmapsAnnotationMapUrl(mapId?: string) {
  const allmapsMapId = getAllmapsAnnotationMapId(mapId)

  if (allmapsMapId) {
    return `https://annotations.allmaps.org/maps/${allmapsMapId}`
  }
}

export function getMapAnnotationSource(
  mapId?: string,
  isEmbedded = false
): MapAnnotationSource {
  if (isEmbedded) {
    return 'embedded'
  }

  return getAllmapsAnnotationMapId(mapId) ? 'allmaps' : 'external'
}

export function getMapAnnotationUrl(mapId?: string, isEmbedded = false) {
  if (isEmbedded) {
    return
  }

  return (
    getAllmapsAnnotationMapUrl(mapId) ?? (isHttpUrl(mapId) ? mapId : undefined)
  )
}

export function getEditableMapEditorUrl(
  map: GeoreferencedMap,
  isEmbedded = false
) {
  if (getMapAnnotationSource(map.id, isEmbedded) !== 'allmaps') {
    return
  }

  return getMapEditorUrl(map)
}

export function getViewMapLabel(view: View) {
  return view === 'image' ? 'View on map' : 'View image'
}

export async function copyMapAnnotation(map: GeoreferencedMap) {
  await navigator.clipboard.writeText(
    JSON.stringify(generateAnnotation(map), null, 2)
  )
}

export async function copyMapAnnotationUrl(mapId: string, isEmbedded = false) {
  const annotationUrl = getMapAnnotationUrl(mapId, isEmbedded)

  if (annotationUrl) {
    await navigator.clipboard.writeText(annotationUrl)
  }
}
