import { writable, derived } from 'svelte/store'

import { computeGeoreferencedMapBearing } from '@allmaps/stdlib'

import { mapsWithImageInfo } from '$lib/shared/stores/maps-with-image-info.js'

export const selectedMapId = writable<string | undefined>(undefined)

export const selectedMapWithImageInfo = derived(
  [selectedMapId, mapsWithImageInfo],
  ([$selectedMapId, $mapsWithImageInfo]) => {
    return $mapsWithImageInfo.find(
      (mapWithImageInfo) => mapWithImageInfo.map.id === $selectedMapId
    )
  }
)

export const previousMapId = derived(
  [selectedMapId, mapsWithImageInfo],
  ([$selectedMapId, $mapsWithImageInfo]) => {
    const index = $mapsWithImageInfo.findIndex(
      (mapWithImageInfo) => mapWithImageInfo.map.id === $selectedMapId
    )

    if (index > -1) {
      return $mapsWithImageInfo[
        (index - 1 + $mapsWithImageInfo.length) % $mapsWithImageInfo.length
      ].map.id
    }
  }
)

export const nextMapId = derived(
  [selectedMapId, mapsWithImageInfo],
  ([$selectedMapId, $mapsWithImageInfo]) => {
    const index = $mapsWithImageInfo.findIndex(
      (mapWithImageInfo) => mapWithImageInfo.map.id === $selectedMapId
    )

    if (index > -1) {
      return $mapsWithImageInfo[
        (index + 1 + $mapsWithImageInfo.length) % $mapsWithImageInfo.length
      ].map.id
    }
  }
)

export const bearing = derived(
  selectedMapWithImageInfo,
  ($selectedMapWithImageInfo) => {
    if ($selectedMapWithImageInfo) {
      return computeGeoreferencedMapBearing($selectedMapWithImageInfo.map)
    } else {
      return 0
    }
  }
)
