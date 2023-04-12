import { get, writable, derived, type Writable } from 'svelte/store'

import { mapsById, maps } from '$lib/shared/stores/maps.js'
import { selectedMaps, selectedMapIds } from '$lib/shared/stores/selected.js'
import { activeMap } from '$lib/shared/stores/active.js'

import { getDefaultRenderOptions } from '$lib/shared/defaults.js'

import type { RenderOptions } from '$lib/shared/types.js'

export const renderOptionsScope = writable<'layer' | 'map'>('layer')

export const renderOptionsLayer = writable<RenderOptions>(
  getDefaultRenderOptions()
)

export function resetRenderOptionsLayer() {
  renderOptionsLayer.set(getDefaultRenderOptions())
}

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
    [renderOptionsScope, renderOptionsLayer, activeMap],
    ([$renderOptionsScope, $renderOptionsLayer, $activeMap]) => {
      if ($renderOptionsScope === 'map' && $activeMap) {
        return $activeMap.renderOptions
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
