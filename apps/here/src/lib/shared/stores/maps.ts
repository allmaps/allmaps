import { writable, derived } from 'svelte/store'

import type { Map } from '@allmaps/annotation'

export const map = writable<Map | undefined>()

export const maps = writable<Map[]>([])

export const mapIndex = derived([map, maps], ([$map, $maps]) => {
  if ($maps.length) {
    return $maps.findIndex((map) => map.id === $map?.id)
  }
})

export const previousMapIndex = derived(
  [mapIndex, maps],
  ([$mapIndex, $maps]) => {
    if ($mapIndex !== undefined) {
      return ($mapIndex - 1 + $maps.length) % $maps.length
    }
  }
)

export const previousMapId = derived(
  [previousMapIndex, maps],
  ([$previousMapIndex, $maps]) => {
    if ($previousMapIndex !== undefined && $maps[$previousMapIndex]) {
      return $maps[$previousMapIndex].id
    }
  }
)

export const nextMapIndex = derived([mapIndex, maps], ([$mapIndex, $maps]) => {
  if ($mapIndex !== undefined) {
    return ($mapIndex + 1) % $maps.length
  }
})

export const nextMapId = derived(
  [nextMapIndex, maps],
  ([$nextMapIndex, $maps]) => {
    if ($nextMapIndex !== undefined && $maps[$nextMapIndex]) {
      return $maps[$nextMapIndex].id
    }
  }
)
