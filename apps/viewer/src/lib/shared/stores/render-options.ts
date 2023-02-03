import { get, writable, derived, type Writable } from 'svelte/store'

import { mapsById, maps } from '$lib/shared/stores/maps.js'
import {
  selectedMaps,
  selectedMapIds,
  lastSelectedMap
} from '$lib/shared/stores/selected.js'

import { defaultRenderOptions } from '$lib/shared/defaults.js'

import type { RenderOptions } from '$lib/shared/types.js'

export const renderOptionsScope = writable<'layer' | 'map'>('layer')

export const renderOptionsLayer = writable<RenderOptions>(defaultRenderOptions)

export const renderOptionsMaps = derived(maps, ($maps) =>
  $maps.map((viewerMap) => viewerMap.renderOptions)
)

export const renderOptionsSelectedMaps = derived(
  selectedMaps,
  ($selectedMaps) =>
    $selectedMaps.map((selectedMap) => selectedMap.renderOptions)
)

export const renderOptions = {
  ...derived(
    [renderOptionsScope, renderOptionsLayer, lastSelectedMap],
    ([$renderOptionsScope, $renderOptionsLayer, $lastSelectedMap]) => {
      if ($renderOptionsScope === 'map' && $lastSelectedMap) {
        return $lastSelectedMap.renderOptions
      } else {
        return $renderOptionsLayer
      }
    }
  ),
  set: function (renderOptions: RenderOptions) {
    const $renderOptionsScope = get(renderOptionsScope)

    if ($renderOptionsScope === 'layer') {
      renderOptionsLayer.set(renderOptions)
    } else {
      const $selectedMapIds = get(selectedMapIds)

      if ($selectedMapIds.length) {
        mapsById.update(($mapsById) => {
          for (let selectedMapId of $selectedMapIds) {
            const viewerMap = $mapsById.get(selectedMapId)

            if (viewerMap) {
              // console.log('now setting', selectedMapId, renderOptions)
              viewerMap.renderOptions = renderOptions
              $mapsById.set(selectedMapId, viewerMap)
            }
          }

          return $mapsById
        })
      }
    }
  }
}
