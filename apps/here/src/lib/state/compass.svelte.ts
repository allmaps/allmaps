import { setContext, getContext } from 'svelte'

import { computeGeoreferencedMapBearing } from '@allmaps/bearing'

import type { GeoreferencedMap } from '@allmaps/annotation'

import type { SensorsState } from '$lib/state/sensors.svelte.js'

import type { CompassMode } from '$lib/shared/types.ts'

const COMPASS_KEY = Symbol('compass')

export class CompassState {
  #sensorsState: SensorsState

  #map = $state.raw<GeoreferencedMap>()

  #compassMode = $state<CompassMode>('image')

  #customRotation = $state(0)

  #selectedMapBearing = $derived.by(() => {
    if (this.#map) {
      try {
        return computeGeoreferencedMapBearing(this.#map)
      } catch (err) {
        console.error('Error computing map bearing:', err)
      }
    }
  })

  #rotation = $derived.by(() => {
    if (
      this.#compassMode === 'image' &&
      this.selectedMapBearing !== undefined
    ) {
      return this.#selectedMapBearing
    } else if (this.#compassMode === 'north') {
      return 0
    } else if (
      this.#compassMode === 'follow-orientation' &&
      this.#sensorsState.hasOrientation
    ) {
      const alpha = this.#sensorsState.orientation?.alpha
      if (alpha !== undefined && alpha !== null) {
        return alpha
      }
    } else if (this.#compassMode === 'custom') {
      return this.#customRotation
    }

    return undefined
  })

  constructor(sensorsState: SensorsState, map?: GeoreferencedMap) {
    this.#sensorsState = sensorsState
    this.#map = map
  }

  set map(map: GeoreferencedMap | undefined) {
    this.#map = map
  }

  get map() {
    return this.#map
  }

  get rotation() {
    return this.#rotation
  }

  set customRotation(rotation: number) {
    this.#customRotation = rotation
  }

  get compassMode() {
    return this.#compassMode
  }

  set compassMode(compassMode: CompassMode) {
    this.#compassMode = compassMode
  }

  get selectedMapBearing() {
    return this.#selectedMapBearing
  }

  nextCompassMode() {
    if (this.#compassMode === 'image') {
      this.#compassMode = 'north'
    } else if (this.#compassMode === 'north') {
      if (this.#sensorsState.hasOrientation) {
        this.#compassMode = 'follow-orientation'
      } else {
        this.#compassMode = 'image'
      }
    } else {
      this.#compassMode = 'image'
    }
  }
}

export function setCompassState(
  sensorsState: SensorsState,
  map?: GeoreferencedMap
) {
  return setContext(COMPASS_KEY, new CompassState(sensorsState, map))
}

export function getCompassState() {
  const compassState =
    getContext<ReturnType<typeof setCompassState>>(COMPASS_KEY)

  if (!compassState) {
    throw new Error('CompassState is not set')
  }

  return compassState
}
