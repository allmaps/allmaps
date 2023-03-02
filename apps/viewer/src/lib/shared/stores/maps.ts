import { writable, derived } from 'svelte/store'

import { generateChecksum } from '@allmaps/id/browser'
import { parseAnnotation } from '@allmaps/annotation'
import { fetchImageInfo } from '@allmaps/stdlib'
import { Image } from '@allmaps/iiif-parser'

import { getDefaultRenderOptions } from '$lib/shared/defaults.js'
import { getBackgroundColor } from '$lib/shared/remove-background.js'

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

      // TODO: get info.json or parsedImage from WarpedMapSource via event
      const imageUri = map.image.uri
      const imageInfo = await fetchImageInfo(imageUri)
      const parsedImage = Image.parse(imageInfo)

      const viewerMap: ViewerMap = {
        sourceId,
        mapId,
        map,
        state: {
          selected: false
        },
        // TODO: detect background color of map?
        renderOptions: getDefaultRenderOptions()
      }

      newViewerMaps.push(viewerMap)
      mapIds.push(mapId)

      // Process image once, also when the same image is used
      // in multiple georeferenced maps
      getBackgroundColor(map, parsedImage).then((color) =>
        setRemoveBackgroundColor(mapId, color)
      ).catch((err) => {
        console.error(`Couldn't detect background color for map ${mapId}`, err)
      })
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

export function setRemoveBackgroundColor(
  mapId: string,
  removeBackgroundColor: string
) {
  mapsById.update(($mapsById) => {
    const viewerMap = $mapsById.get(mapId)

    if (viewerMap) {
      viewerMap.renderOptions.removeBackground.color = removeBackgroundColor
    }

    return $mapsById
  })
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

export function resetMaps() {
  mapsById.set(new Map())
}

export const mapIds = derived(mapsById, ($mapsById) => $mapsById.keys())

export const maps = derived(mapsById, ($mapsById) => [...$mapsById.values()])

export const mapCount = derived(mapsById, ($mapsById) => $mapsById.size)
