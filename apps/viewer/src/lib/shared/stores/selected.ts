import { derived } from 'svelte/store'

import { mapsById } from '$lib/shared/stores/maps.js'
import { activeMapId } from '$lib/shared/stores/active.js'

export const selectedMaps = derived(mapsById, ($mapsById) =>
  [...$mapsById.values()].filter((map) => map.state.selected)
)

export function setSelectedMaps(mapIds: Iterable<string>, updateView: boolean) {
  mapsById.update(($mapsById) => {
    let lastMapId: string | undefined

    const mapIdsSet = new Set(mapIds)

    for (let [mapId, viewerMap] of $mapsById.entries()) {
      const selected = mapIdsSet.has(mapId)
      viewerMap.state.selected = selected
      $mapsById.set(mapId, viewerMap)

      if (selected) {
        lastMapId = mapId
      }
    }

    if (lastMapId) {
      activeMapId.set({ mapId: lastMapId, updateView })
    }

    return $mapsById
  })
}

export function selectMap(mapId: string, updateView: boolean = false) {
  updateSelectedMaps([mapId], [], updateView)
}

export function deselectMap(mapId: string, updateView: boolean = false) {
  updateSelectedMaps([], [mapId], updateView)
}

export function updateSelectedMaps(
  selectedMapIds: Iterable<string>,
  deselectedMapIds: Iterable<string>,
  updateView: boolean
) {
  mapsById.update(($mapsById) => {
    let lastMapId: string | undefined

    for (let mapId of selectedMapIds) {
      const viewerMap = $mapsById.get(mapId)

      if (viewerMap) {
        viewerMap.state.selected = true
        $mapsById.set(mapId, viewerMap)
      }

      lastMapId = mapId
    }

    if (lastMapId) {
      activeMapId.set({ mapId: lastMapId, updateView })
    }

    for (let mapId of deselectedMapIds) {
      const viewerMap = $mapsById.get(mapId)

      if (viewerMap) {
        viewerMap.state.selected = false
        $mapsById.set(mapId, viewerMap)
      }
    }

    return $mapsById
  })
}

export const selectedMapCount = derived(
  selectedMaps,
  ($selectedMaps) => $selectedMaps.length
)

export const selectedMapIds = derived(selectedMaps, ($selectedMaps) =>
  $selectedMaps.map((selectedMap) => selectedMap.mapId)
)
