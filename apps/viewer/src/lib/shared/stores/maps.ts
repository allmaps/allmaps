import { writable, derived, get } from 'svelte/store'

import { generateChecksum } from '@allmaps/id'
import {
  parseAnnotation,
  generateAnnotation,
  type Map as Georef
} from '@allmaps/annotation'

import { getDefaultRenderOptions } from '$lib/shared/defaults.js'
import { fromHue } from '$lib/shared/color.js'
import {
  mapWarpedMapSource,
  mapWarpedMapLayer,
  addMap,
  removeMap
} from '$lib/shared/stores/openlayers.js'

import type { ViewerMap } from '$lib/shared/types.js'

import type { Point } from '@allmaps/types'

type SourceMaps = Map<string, ViewerMap>

export const mapsById = writable<SourceMaps>(new Map())

export const mapIndex = writable<number[]>([])

// async function addMap () {
export type MapIDOrError = string | Error
// }

async function createAndAddViewerMap(
  sourceId: string,
  index: number,
  map: Georef
): Promise<ViewerMap> {
  const mapIdOrError = await addMap(map)

  let mapId
  if (typeof mapIdOrError === 'string') {
    mapId = mapIdOrError
  } else {
    mapId = await generateChecksum(map)
  }

  const viewerMap: ViewerMap = {
    sourceId,
    mapId,
    error: mapIdOrError instanceof Error ? mapIdOrError : undefined,
    index,
    map,
    annotation: generateAnnotation(map),
    opacity: 1,
    state: {
      visible: true,
      selected: false,
      highlighted: false
    },
    renderOptions: getDefaultRenderOptions({
      colorize: {
        enabled: false,
        color: fromHue((index * 60) % 360)
      }
    })
  }

  return viewerMap
}

export async function addAnnotation(sourceId: string, json: unknown) {
  let startIndex = get(mapCount)

  const maps = parseAnnotation(json)

  const mapIds: MapIDOrError[] = []

  if (maps.length) {
    const newViewerMaps: ViewerMap[] = []

    const settledResults = await Promise.allSettled(
      maps.map((map) => createAndAddViewerMap(sourceId, startIndex++, map))
    )

    for (const settledResult of settledResults) {
      if (settledResult.status === 'fulfilled') {
        const viewerMap = settledResult.value
        newViewerMaps.push(viewerMap)
      } else {
        console.warn('Error adding map', settledResult.reason)
      }
    }

    mapsById.update(($mapsById) => {
      for (const viewerMap of newViewerMaps) {
        $mapsById.set(viewerMap.mapId, viewerMap)
      }

      return $mapsById
    })
  }

  return mapIds
}

export function resetCustomResourceMask(mapId: string) {
  mapsById.update(($mapsById) => {
    const viewerMap = $mapsById.get(mapId)

    if (viewerMap) {
      viewerMap.state.customResourceMask = undefined
      mapWarpedMapSource.setMapResourceMask(mapId, viewerMap.map.resourceMask)
    }

    return $mapsById
  })
}

export function setCustomResourceMask(
  mapId: string,
  customResourceMask: Point[]
) {
  mapsById.update(($mapsById) => {
    const viewerMap = $mapsById.get(mapId)

    if (viewerMap) {
      viewerMap.state.customResourceMask = customResourceMask
      mapWarpedMapSource.setMapResourceMask(mapId, customResourceMask)
    }

    return $mapsById
  })
}

export function setRemoveBackgroundColor(
  mapId: string,
  removeBackgroundColor: string
) {
  mapsById.update(($mapsById) => {
    const viewerMap = $mapsById.get(mapId)

    if (viewerMap) {
      viewerMap.renderOptions.removeBackground.color = removeBackgroundColor
      mapWarpedMapLayer?.setMapRemoveColor(mapId, {
        hexColor: removeBackgroundColor,
        threshold: viewerMap.renderOptions.removeBackground.threshold,
        hardness: viewerMap.renderOptions.removeBackground.hardness
      })
    }

    return $mapsById
  })
}

export async function removeAnnotation(sourceId: string) {
  mapsById.update(($mapsById) => {
    for (const [id, viewerMap] of $mapsById.entries()) {
      if (viewerMap.sourceId === sourceId) {
        $mapsById.delete(id)
        removeMap(viewerMap.map)
      }
    }

    return $mapsById
  })
}

export function resetMaps() {
  mapsById.set(new Map())
}

export const mapIds = derived(mapsById, ($mapsById) => [...$mapsById.keys()])

export const maps = derived(mapsById, ($mapsById) => [...$mapsById.values()])

export const mapCount = derived(mapsById, ($mapsById) => $mapsById.size)

export const visibleMaps = derived(mapsById, ($mapsById) =>
  [...$mapsById.values()].filter((map) => map.state.visible)
)

export const visibleMapCount = derived(
  visibleMaps,
  ($visibleMaps) => $visibleMaps.length
)
