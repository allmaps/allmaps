import { writable, derived, get } from 'svelte/store'

import type { TransformationType } from '@allmaps/transform'

import { mapIds } from '$lib/shared/stores/maps.js'
import { mapWarpedMapSource } from '$lib/shared/stores/openlayers.js'

const transformations: TransformationType[] = [
  // 'helmert',
  'polynomial',
  // 'polynomial1',
  // 'polynomial2',
  // 'polynomial3',
  // 'projective',
  'thin-plate-spline'
]

export const transformationIndex = writable<number>(0)

export const transformation = derived(
  transformationIndex,
  ($transformationIndex) => transformations[$transformationIndex]
)

export function nextTransformation() {
  transformationIndex.update(
    ($transformationIndex) =>
      ($transformationIndex + 1) % transformations.length
  )
}

transformation.subscribe(($transformation) => {
  const $mapIds = get(mapIds)
  mapWarpedMapSource.setTransformation($mapIds, $transformation)
})
