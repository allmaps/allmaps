import { writable, derived, get } from 'svelte/store'

import { PUBLIC_ANNOTATIONS_URL } from '$env/static/public'

import { fetchJson } from '@allmaps/stdlib'
import { parseAnnotation } from '@allmaps/annotation'

import { addImageInfo } from '$lib/shared/stores/image-infos.js'

import type { GeoreferencedMap } from '@allmaps/annotation'

function getMapId(map: GeoreferencedMap) {
  // TODO: throw error instead of returning '-'??
  return map.id || '-'
}

export const mapsFromCoordinates = writable<Map<string, GeoreferencedMap>>(
  new Map()
)
export const mapsFromUrl = writable<Map<string, GeoreferencedMap>>(new Map())

export const maps = derived(
  [mapsFromCoordinates, mapsFromUrl],
  ([$mapsFromCoordinates, $mapsFromUrl]) =>
    new Map([...$mapsFromCoordinates, ...$mapsFromUrl])
)

export async function loadMapsFromCoordinates(
  latitude: number,
  longitude: number
) {
  const url = `${PUBLIC_ANNOTATIONS_URL}/maps?limit=25&intersects=${[
    latitude,
    longitude
  ].join(',')}`

  const annotations = await fetchJson(url)
  const maps = parseAnnotation(annotations)
  maps.forEach((map) => addImageInfo(map.resource.id))
  mapsFromCoordinates.set(new Map(maps.map((map) => [getMapId(map), map])))
}

export async function loadMapsFromUrl(url: string) {
  if (!url) {
    return
  }

  // If the URL is a map ID, and the map is already loaded, do nothing
  if (mapExists(url)) {
    return
  }

  const annotations = await fetchJson(url)
  const maps = parseAnnotation(annotations)
  maps.forEach((map) => addImageInfo(map.resource.id))

  mapsFromUrl.set(new Map(maps.map((map) => [getMapId(map), map])))
}

export function mapExists(mapId: string) {
  return get(maps).has(mapId)
}
