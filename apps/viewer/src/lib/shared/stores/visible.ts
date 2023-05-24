import { derived } from 'svelte/store'

import { mapsById } from '$lib/shared/stores/maps.js'
import { deselectMap, deselectMaps } from '$lib/shared/stores/selected.js'

import {
  showMap as olShowMap,
  hideMap as olHideMap
} from '$lib/shared/stores/openlayers.js'

export function showMap(mapId: string) {
  updateVisibleMaps([mapId], [])
}

export function showMaps(mapIds: string[]) {
  updateVisibleMaps(mapIds, [])
}

export function hideMap(mapId: string) {
  deselectMap(mapId)
  updateVisibleMaps([], [mapId])
}

export function hideMaps(mapIds: string[]) {
  deselectMaps(mapIds)
  updateVisibleMaps([], mapIds)
}

function updateVisibleMaps(
  visibleMapIds: Iterable<string>,
  hiddenMapIds: Iterable<string>
) {
  mapsById.update(($mapsById) => {
    // TODO: set hidden maps unselected and not active

    for (const mapId of visibleMapIds) {
      const viewerMap = $mapsById.get(mapId)

      if (viewerMap) {
        viewerMap.state.visible = true
        $mapsById.set(mapId, viewerMap)
        olShowMap(mapId)
      }
    }

    for (const mapId of hiddenMapIds) {
      const viewerMap = $mapsById.get(mapId)

      if (viewerMap) {
        viewerMap.state.visible = false
        $mapsById.set(mapId, viewerMap)
        olHideMap(mapId)
      }
    }

    return $mapsById
  })
}

export const visibleMapIds = derived(mapsById, ($mapsById) =>
  [...$mapsById.values()]
    .filter((viewerMap) => viewerMap.state.visible)
    .map((viewerMap) => viewerMap.mapId)
)

export const hiddenMapIds = derived(mapsById, ($mapsById) =>
  [...$mapsById.values()]
    .filter((viewerMap) => !viewerMap.state.visible)
    .map((viewerMap) => viewerMap.mapId)
)
