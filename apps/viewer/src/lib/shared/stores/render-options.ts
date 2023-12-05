import { writable, derived } from 'svelte/store'

import { mapWarpedMapLayer } from '$lib/shared/stores/openlayers.js'
import { mapsById, maps } from '$lib/shared/stores/maps.js'
import { selectedMaps } from '$lib/shared/stores/selected.js'

import { getDefaultRenderOptions } from '$lib/shared/defaults.js'

import type { RenderOptions } from '$lib/shared/types.js'

export const renderOptionsLayer = writable<RenderOptions>(
  getDefaultRenderOptions()
)

export function resetRenderOptionsLayer() {
  renderOptionsLayer.set(getDefaultRenderOptions())
}

export function setRenderOptionsForMap(
  mapId: string,
  partialRenderOptions: Partial<RenderOptions>
) {
  mapsById.update(($mapsById) => {
    const viewerMap = $mapsById.get(mapId)

    if (viewerMap) {
      viewerMap.renderOptions = {
        ...viewerMap.renderOptions,
        ...partialRenderOptions
      }

      if (mapWarpedMapLayer) {
        if (viewerMap.renderOptions.removeBackground.color) {
          mapWarpedMapLayer.setMapRemoveColor(mapId, {
            hexColor: viewerMap.renderOptions.removeBackground.color,
            threshold: viewerMap.renderOptions.removeBackground.threshold,
            hardness: viewerMap.renderOptions.removeBackground.hardness
          })
        } else {
          mapWarpedMapLayer.resetMapRemoveColor(mapId)
        }

        if (
          viewerMap.renderOptions.colorize.enabled &&
          viewerMap.renderOptions.colorize.color
        ) {
          mapWarpedMapLayer.setMapColorize(
            mapId,
            viewerMap.renderOptions.colorize.color
          )
        } else {
          mapWarpedMapLayer.resetMapColorize(mapId)
        }
      }

      $mapsById.set(mapId, viewerMap)
    }

    return $mapsById
  })
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
  ...renderOptionsLayer,
  set: (renderOptions: Partial<RenderOptions>) => {
    renderOptionsLayer.update(($renderOptionsLayer) => {
      $renderOptionsLayer = {
        ...$renderOptionsLayer,
        ...renderOptions
      }

      if (mapWarpedMapLayer) {
        if ($renderOptionsLayer.removeBackground.threshold > 0) {
          mapWarpedMapLayer.setRemoveColor($renderOptionsLayer.removeBackground)
        } else {
          mapWarpedMapLayer.resetRemoveColor()
        }

        if (
          $renderOptionsLayer.colorize.enabled &&
          $renderOptionsLayer.colorize.color
        ) {
          mapWarpedMapLayer.setColorize($renderOptionsLayer.colorize.color)
        } else {
          mapWarpedMapLayer.resetColorize()
        }
      }

      return $renderOptionsLayer
    })
  }
}

// export const renderOptions = {
//   ...derived(
//     [renderOptionsScope, renderOptionsLayer, activeMap],
//     ([$renderOptionsScope, $renderOptionsLayer, $activeMap]) => {
//       if ($renderOptionsScope === 'map' && $activeMap) {
//         return $activeMap.viewerMap.renderOptions
//       } else {
//         return $renderOptionsLayer
//       }
//     }
//   ),
//   set: function (renderOptions: RenderOptions) {
//     const $renderOptionsScope = get(renderOptionsScope)

//     if ($renderOptionsScope === 'layer') {
//       renderOptionsLayer.set(renderOptions)
//     } else {
//       const $selectedMapIds = get(selectedMapIds)

//       if ($selectedMapIds.length) {
//         mapsById.update(($mapsById) => {
//           for (let selectedMapId of $selectedMapIds) {
//             const viewerMap = $mapsById.get(selectedMapId)

//             if (viewerMap) {
//               viewerMap.renderOptions = renderOptions
//               $mapsById.set(selectedMapId, viewerMap)
//             }
//           }

//           return $mapsById
//         })
//       }
//     }
//   }
// }
