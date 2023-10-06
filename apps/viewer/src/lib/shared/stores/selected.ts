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

    for (const [mapId, viewerMap] of $mapsById.entries()) {
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

export function selectMap(mapId: string, updateView = false) {
  updateSelectedMaps([mapId], [], updateView)
}

export function selectMaps(mapIds: string[], updateView = false) {
  updateSelectedMaps(mapIds, [], updateView)
}

export function deselectMap(mapId: string, updateView = false) {
  updateSelectedMaps([], [mapId], updateView)
}

export function deselectMaps(mapIds: string[], updateView = false) {
  updateSelectedMaps([], mapIds, updateView)
}

export function updateSelectedMaps(
  selectedMapIds: Iterable<string>,
  deselectedMapIds: Iterable<string>,
  updateView: boolean
) {
  mapsById.update(($mapsById) => {
    let lastMapId: string | undefined

    for (const mapId of selectedMapIds) {
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

    for (const mapId of deselectedMapIds) {
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

export const firstSelectedMapId = derived(
  selectedMapIds,
  ($selectedMapIds) => $selectedMapIds[0]
)
