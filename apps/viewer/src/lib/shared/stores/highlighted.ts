import { writable, derived } from 'svelte/store'

import { maps } from '$lib/shared/stores/maps.js'
import { selectedMaps } from '$lib/shared/stores/selected.js'

export const highlightedIndex = writable(0)

export const highlightedMaps = derived(
  [maps, selectedMaps],
  ([$maps, $selectedMaps]) => {
    if ($selectedMaps.length > 0) {
      return $selectedMaps
    } else {
      return $maps
    }
  }
)

export const highlightedMap = derived(
  [highlightedMaps, highlightedIndex],
  ([$highlightedMaps, $highlightedIndex]) => {
    const length = $highlightedMaps.length

    const index = ($highlightedIndex + length) % length

    return $highlightedMaps[index]
  }
)
