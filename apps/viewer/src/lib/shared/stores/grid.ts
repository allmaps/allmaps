import { writable, get } from 'svelte/store'

import { mapIds } from '$lib/shared/stores/maps.js'
import { setRenderOptionsForMap } from './render-options.js'

const DEFAULT_GRID = false

export const grid = writable<boolean>(DEFAULT_GRID)

export function toggleGrid() {
  grid.update(($grid) => {
    $grid = !$grid
    const $mapIds = get(mapIds)
    for (const mapId of $mapIds) {
      setRenderOptionsForMap(mapId, {
        grid: {
          enabled: $grid
        }
      })
    }
    return $grid
  })
}
