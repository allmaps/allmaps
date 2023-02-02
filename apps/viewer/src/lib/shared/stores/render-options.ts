import { get, writable, derived, type Writable } from 'svelte/store'

import { mapsById } from '$lib/shared/stores/maps.js'
import { selectedMapIds } from '$lib/shared/stores/selected.js'

import type { RenderOptions } from '$lib/shared/types.js'

const defaultRenderOptions: RenderOptions = {
  opacity: 1,
  removeBackground: {
    enabled: false,
    color: '#faeed4',
    threshold: 0.2,
    hardness: 0.7
  },
  colorize: {
    enabled: false,
    color: '#ff0000'
  }
}

type RenderOptionsByMapId = Map<string, Writable<RenderOptions>>

export const renderOptionsAll = writable<RenderOptions>(defaultRenderOptions)
export const renderOptionsByMapId = writable<RenderOptionsByMapId>(new Map())
export const mapId = writable<string>()
export const renderOptionsScope = writable<'layer' | 'map'>('layer')



mapsById.subscribe(($mapsById) => {
  renderOptionsByMapId.update(($renderOptionsByMapId) => {
    // Remove mapIds that no longer exist from selectedMapIds
    for (let mapId of $renderOptionsByMapId.keys()) {
      if (!$mapsById.has(mapId)) {
        $renderOptionsByMapId.delete(mapId)
      }
    }

    // Add new mapIds to selectedMapIdsStore
    // and set as not selected
    for (let mapId of $mapsById.keys()) {
      if (!$renderOptionsByMapId.has(mapId)) {
        const sourceMap = $mapsById.get(mapId)

        if (sourceMap) {
          $renderOptionsByMapId.set(mapId, writable(defaultRenderOptions))
        }
      }
    }

    console.log('$renderOptionsByMapId', $renderOptionsByMapId)
    return $renderOptionsByMapId
  })
})


export const renderOptionsForSelectedMaps = derived(
  [renderOptionsByMapId, selectedMapIds],
  ([$renderOptionsByMapId, $selectedMapIds]) =>
    $selectedMapIds
      .filter((mapId) => $renderOptionsByMapId.has(mapId))
      .map((mapId) => $renderOptionsByMapId.get(mapId)!)
)

selectedMapIds.subscribe((s) => {
  console.log('selectedMapIds', s)
})

renderOptionsForSelectedMaps.subscribe((v) =>
{
  console.log('renderOptionsForSelectedMaps', v)
})

// export const renderOptions = get(renderOptionsByMapId).get(get(mapId))

export const renderOptions = {
  ...derived(
    [renderOptionsAll, ...get(renderOptionsForSelectedMaps)],
    ([$renderOptionsAll, ...$renderOptionsForSelectedMaps]) => {
      console.log(
        '$renderOptionsForSelectedMaps',
        $renderOptionsForSelectedMaps
      )
      return $renderOptionsAll
    }
  ),
  set: function (renderOptions: RenderOptions) {
    renderOptionsAll.set(renderOptions)
    console.log('nu iupdate', renderOptions)
  }
}
