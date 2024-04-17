import { writable, derived, get } from 'svelte/store'

import type { DistortionMeasure } from '@allmaps/transform'

import { mapIds } from '$lib/shared/stores/maps.js'
import { mapWarpedMapSource } from '$lib/shared/stores/openlayers.js'

const distortionMeasures: (DistortionMeasure | undefined)[] = [
  undefined,
  'log2sigma',
  'twoOmega'
]

const DEFAULT_DISTORTIONMEASURE_INDEX = 0

export const distortionMeasureIndex = writable<number>(
  DEFAULT_DISTORTIONMEASURE_INDEX
)

export const distortionMeasure = derived(
  distortionMeasureIndex,
  ($distortionMeasureIndex) => distortionMeasures[$distortionMeasureIndex]
)

export function resetDistortionMeasure() {
  distortionMeasureIndex.set(DEFAULT_DISTORTIONMEASURE_INDEX)
}

export function nextDistortionMeasure() {
  distortionMeasureIndex.update(
    ($distortionMeasureIndex) =>
      ($distortionMeasureIndex + 1) % distortionMeasures.length
  )
}

distortionMeasure.subscribe(($distortionMeasure) => {
  const $mapIds = get(mapIds)
  mapWarpedMapSource.setMapsDistortionMeasure($mapIds, $distortionMeasure)
})
