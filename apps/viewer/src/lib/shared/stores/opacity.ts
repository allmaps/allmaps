import { writable } from 'svelte/store'

import { mapsById } from '$lib/shared/stores/maps.js'
import { mapWarpedMapLayer } from '$lib/shared/stores/openlayers.js'

export const opacity = {
  ...writable(1),
  set: ($opacity: number) => {
    mapWarpedMapLayer?.setOpacity($opacity)
  }
}

export function setMapOpacity(mapId: string, opacity: number) {
  mapsById.update(($mapsById) => {
    const viewerMap = $mapsById.get(mapId)

    if (viewerMap) {
      viewerMap.opacity = opacity
      $mapsById.set(mapId, viewerMap)
    }

    return $mapsById
  })
}
