import { writable, derived, get } from 'svelte/store'

import { mapsById, visibleMaps } from '$lib/shared/stores/maps.js'
import {
  selectedMaps,
  selectedMapCount,
  setSelectedMaps
} from '$lib/shared/stores/selected.js'
import { warpedMapSource } from '$lib/shared/stores/openlayers.js'

import type { ViewerMap } from '$lib/shared/types.js'

// The active map is:
// - Map view: the last map to be selected, either by clicking on the map or by using the arrow buttons
// - Image view: the currently visible map

// Map view:
//  - If multiple selected:
//      Fly to next selected map and make this map active
//  - If 0 or 1 selected:
//      Fly to next map and make this map active
// Image view:
//  - If multiple selected:
//      Show next selected map and make this map active
//  - If 0 or 1 selected
//      Show next map and make this map active

type ActiveMapId = {
  mapId: string
  updateView: boolean
}

type ActiveMap = {
  viewerMap: ViewerMap
  updateView: boolean
}

export const activeMapId = writable<ActiveMapId>()

function setNextOrPrevMapActive(
  direction: 'next' | 'prev',
  updateView: boolean
) {
  let loopIndexToMapIndex: (index: number) => number

  if (direction === 'next') {
    loopIndexToMapIndex = (index) => index
  } else {
    loopIndexToMapIndex = (index) => $maps.length - index - 1
  }

  let newActiveMapId

  const $selectedMapCount = get(selectedMapCount)
  const $activeMapId = get(activeMapId)

  let $maps: ViewerMap[]

  if ($selectedMapCount > 1) {
    $maps = get(selectedMaps)
  } else {
    $maps = get(visibleMaps)
  }

  let lastMapActive = false

  for (let index = 0; index < $maps.length; index++) {
    const mapIndex = loopIndexToMapIndex(index)
    const viewerMap = $maps[mapIndex]

    if (lastMapActive) {
      newActiveMapId = viewerMap.mapId
      break
    }

    if (viewerMap.mapId === $activeMapId.mapId) {
      lastMapActive = true
    }
  }

  if (!newActiveMapId) {
    const firstViewerMap = $maps[loopIndexToMapIndex(0)]
    newActiveMapId = firstViewerMap.mapId
  }

  activeMapId.set({ mapId: newActiveMapId, updateView })

  if ($selectedMapCount <= 1) {
    setSelectedMaps([newActiveMapId], updateView)
  }
}

export function setNextMapActive(updateView: boolean) {
  setNextOrPrevMapActive('next', updateView)
}

export function setPrevMapActive(updateView: boolean) {
  setNextOrPrevMapActive('prev', updateView)
}

export const activeMap = derived(
  [mapsById, activeMapId],
  ([$mapsById, $activeMapId]): ActiveMap | undefined => {
    if (!$activeMapId) {
      const firstMapId = [...$mapsById.keys()][0]
      activeMapId.set({ mapId: firstMapId, updateView: false })
    } else {
      const viewerMap = $mapsById.get($activeMapId.mapId)
      if (viewerMap) {
        return {
          viewerMap,
          updateView: $activeMapId.updateView
        }
      }
    }
  }
)

activeMapId.subscribe(($activeMapId) => {
  if ($activeMapId) {
    const $warpedMapSource = get(warpedMapSource)

    if ($warpedMapSource && $activeMapId.updateView) {
      $warpedMapSource.bringToFront([$activeMapId.mapId])
    }
  }
})
