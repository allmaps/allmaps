import { derived } from 'svelte/store'

import { mapsById } from '$lib/shared/stores/maps.js'
import { deselectMap } from '$lib/shared/stores/selected.js'

export function showMap(mapId: string) {
  updateVisibleMaps([mapId], [])
}
export function hideMap(mapId: string) {
  deselectMap(mapId)
  updateVisibleMaps([], [mapId])
}

function updateVisibleMaps(
  visibleMapIds: Iterable<string>,
  hiddenMapIds: Iterable<string>
) {
  mapsById.update(($mapsById) => {
    // TODO: set hidden maps unselected and not active

    for (let mapId of visibleMapIds) {
      const viewerMap = $mapsById.get(mapId)

      if (viewerMap) {
        viewerMap.state.visible = true
        $mapsById.set(mapId, viewerMap)
      }
    }

    for (let mapId of hiddenMapIds) {
      const viewerMap = $mapsById.get(mapId)

      if (viewerMap) {
        viewerMap.state.visible = false
        $mapsById.set(mapId, viewerMap)
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
