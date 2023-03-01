import { writable, derived } from 'svelte/store'

import { mapsById } from '$lib/shared/stores/maps.js'

import type { ViewerMap } from '$lib/shared/types.js'

export const selectedMaps = derived(mapsById, ($mapsById) =>
  [...$mapsById.values()].filter((map) => map.state.selected)
)

export const lastSelectedMap = writable<ViewerMap | undefined>()

export function selectMap(mapId: string) {
  updateSelectedMaps([mapId], [])
}
export function deselectMap(mapId: string) {
  updateSelectedMaps([], [mapId])
}

export function updateSelectedMaps(
  selectedMapIds: Iterable<string>,
  deselectedMapIds: Iterable<string>
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
      lastSelectedMap.set($mapsById.get(lastMapId))
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
