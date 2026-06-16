import { generateAnnotation } from '@allmaps/annotation'

import type { GeoreferencedMap } from '@allmaps/annotation'

export type View = 'map' | 'image'

export function getMapEditorUrl(map: GeoreferencedMap) {
  return `https://editor.allmaps.org/#/mask?url=${encodeURIComponent(
    map.resource.id
  )}`
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

export function getMapAnnotationUrl(mapId: string) {
  return getAllmapsAnnotationMapUrl(mapId) ?? mapId
}

export function getViewMapLabel(view: View) {
  return view === 'image' ? 'View on map' : 'View image'
}

export async function copyMapAnnotation(map: GeoreferencedMap) {
  await navigator.clipboard.writeText(
    JSON.stringify(generateAnnotation(map), null, 2)
  )
}

export async function copyMapAnnotationUrl(mapId: string) {
  await navigator.clipboard.writeText(getMapAnnotationUrl(mapId))
}
