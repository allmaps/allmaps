import { writable, derived } from 'svelte/store'

import { generateChecksum } from '@allmaps/id/browser'
import { parseAnnotation } from '@allmaps/annotation'

import { defaultRenderOptions } from '$lib/shared/defaults.js'

import type { ViewerMap } from '$lib/shared/types.js'

type SourceMaps = Map<string, ViewerMap>

export const mapsById = writable<SourceMaps>(new Map())

export async function addAnnotation(sourceId: string, json: any) {
  const maps = parseAnnotation(json)

  let mapIds: string[] = []

  if (maps.length) {
    let newViewerMaps: ViewerMap[] = []

    for (let map of maps) {
      const mapId = map.id || (await generateChecksum(map))

      const viewerMap: ViewerMap = {
        sourceId,
        mapId,
        map,
        state: {
          selected: false
        },
        // TODO: detect background color of map?
        renderOptions: defaultRenderOptions
      }

      newViewerMaps.push(viewerMap)
      mapIds.push(mapId)
    }

    mapsById.update(($mapsById) => {
      for (let viewerMap of newViewerMaps) {
        $mapsById.set(viewerMap.mapId, viewerMap)
      }

      return $mapsById
    })
  }

  return mapIds
}

export function removeAnnotation(sourceId: string) {
  mapsById.update(($mapsById) => {
    for (let [id, map] of $mapsById.entries()) {
      if (map.sourceId === sourceId) {
        $mapsById.delete(id)
      }
    }

    return $mapsById
  })
}

export function resetMaps () {
  mapsById.set(new Map())
}

export const mapIds = derived(mapsById, ($mapsById) => $mapsById.keys())

export const maps = derived(mapsById, ($mapsById) => [...$mapsById.values()])

export const mapCount = derived(mapsById, ($mapsById) => $mapsById.size)
